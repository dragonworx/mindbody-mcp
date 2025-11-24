import type { MindbodyApiClient } from "./mindbody.js";
import type { DatabaseClient } from "../db/client.js";

/**
 * Sync orchestrator for handling pagination and batch operations
 */
export class SyncService {
  constructor(
    private apiClient: MindbodyApiClient,
    private db: DatabaseClient
  ) {}

  /**
   * Sync all clients from Mindbody to local cache
   */
  async syncClients(params: {
    status?: "Active" | "Inactive" | "All";
    sinceDate?: string;
    force?: boolean;
  }): Promise<{
    totalSynced: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalSynced = 0;
    let offset = 0;
    const limit = 100;

    try {
      this.db.addSyncLog({
        operation: "sync_clients",
        status: "success",
        message: `Starting client sync (status: ${params.status ?? "Active"})`,
      });

      while (true) {
        try {
          const response = await this.apiClient.getClients({
            limit,
            offset,
            status: params.status !== "All" ? params.status : undefined,
            force: params.force,
          });

          // Extract clients from response (handle different possible response structures)
          const clients = (response.Clients ?? response.clients ?? []) as Array<{
            Id: string;
            FirstName?: string;
            LastName?: string;
            Email?: string;
            Status?: string;
            [key: string]: unknown;
          }>;

          if (clients.length === 0) {
            break; // No more clients to fetch
          }

          // Save clients to database
          this.db.saveClients(
            clients.map((client) => ({
              id: client.Id,
              firstName: client.FirstName,
              lastName: client.LastName,
              email: client.Email,
              status: client.Status,
              rawData: client,
            }))
          );

          totalSynced += clients.length;

          // Check if we've fetched all clients
          const pagination = response.PaginationResponse;
          if (pagination && totalSynced >= pagination.TotalResults) {
            break;
          }

          // If we got fewer results than requested, we're done
          if (clients.length < limit) {
            break;
          }

          offset += limit;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Error at offset ${offset}: ${errorMessage}`);

          // If it's a rate limit error, stop
          if (errorMessage.includes("limit")) {
            break;
          }

          // Otherwise, try to continue with next batch
          offset += limit;
        }
      }

      this.db.addSyncLog({
        operation: "sync_clients",
        status: errors.length > 0 ? "warning" : "success",
        message: `Synced ${totalSynced} clients`,
        details: { errors },
      });

      return { totalSynced, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.db.addSyncLog({
        operation: "sync_clients",
        status: "error",
        message: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Sync sales data for a date range, automatically chunking if needed
   */
  async syncSales(params: {
    startDate: string;
    endDate: string;
    force?: boolean;
  }): Promise<{
    totalSynced: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let totalSynced = 0;

    try {
      this.db.addSyncLog({
        operation: "sync_sales",
        status: "success",
        message: `Starting sales sync (${params.startDate} to ${params.endDate})`,
      });

      // Calculate date chunks (weekly intervals to avoid timeouts)
      const dateChunks = this.chunkDateRange(params.startDate, params.endDate, 7);

      for (const chunk of dateChunks) {
        let offset = 0;
        const limit = 100;

        while (true) {
          try {
            const response = await this.apiClient.getSales({
              startDate: chunk.start,
              endDate: chunk.end,
              limit,
              offset,
              force: params.force,
            });

            // Extract sales from response
            const sales = (response.Sales ?? response.sales ?? []) as Array<{
              Id: string;
              SaleDate?: string;
              ClientId?: string;
              TotalAmount?: number;
              [key: string]: unknown;
            }>;

            if (sales.length === 0) {
              break; // No more sales to fetch for this chunk
            }

            // Save sales to database
            this.db.saveSales(
              sales.map((sale) => ({
                id: sale.Id,
                saleDate: sale.SaleDate ?? chunk.start,
                clientId: sale.ClientId,
                totalAmount: sale.TotalAmount,
                rawData: sale,
              }))
            );

            totalSynced += sales.length;

            // Check if we've fetched all sales for this chunk
            const pagination = response.PaginationResponse;
            if (pagination && (offset + sales.length) >= pagination.TotalResults) {
              break;
            }

            // If we got fewer results than requested, we're done with this chunk
            if (sales.length < limit) {
              break;
            }

            offset += limit;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`Error for chunk ${chunk.start} to ${chunk.end} at offset ${offset}: ${errorMessage}`);

            // If it's a rate limit error, stop completely
            if (errorMessage.includes("limit")) {
              this.db.addSyncLog({
                operation: "sync_sales",
                status: "warning",
                message: `Rate limit reached. Synced ${totalSynced} sales before stopping`,
                details: { errors },
              });
              return { totalSynced, errors };
            }

            // Otherwise, move to next chunk
            break;
          }
        }
      }

      this.db.addSyncLog({
        operation: "sync_sales",
        status: errors.length > 0 ? "warning" : "success",
        message: `Synced ${totalSynced} sales`,
        details: { errors },
      });

      return { totalSynced, errors };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.db.addSyncLog({
        operation: "sync_sales",
        status: "error",
        message: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Split a date range into smaller chunks
   */
  private chunkDateRange(
    startDate: string,
    endDate: string,
    daysPerChunk: number
  ): Array<{ start: string; end: string }> {
    const chunks: Array<{ start: string; end: string }> = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let currentStart = start;

    while (currentStart < end) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + daysPerChunk);

      if (currentEnd > end) {
        currentEnd.setTime(end.getTime());
      }

      chunks.push({
        start: currentStart.toISOString().split("T")[0] as string,
        end: currentEnd.toISOString().split("T")[0] as string,
      });

      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
    }

    return chunks;
  }
}
