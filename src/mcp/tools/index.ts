import { z } from "zod";
import type { MindbodyApiClient } from "../../services/mindbody.js";
import type { DatabaseClient } from "../../db/client.js";
import type { SyncService } from "../../services/sync.js";
import type { AppointmentService } from "../../services/appointment.js";
import { join } from "path";
import type { Config } from "../../config.js";
import { GetAppointmentsParamsSchema } from "../../types/appointment.js";


export const syncClientsSchema = z.object({
  status: z.enum(["Active", "Inactive", "All"]).default("Active"),
  since_date: z.string().optional().describe("ISO date string for delta syncs"),
  force: z.boolean().default(false).describe("Override rate limit checks"),
});

export const getAppointmentsSchema = GetAppointmentsParamsSchema;

export const exportSalesHistorySchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  format: z.enum(["json", "csv"]).default("json"),
  force: z.boolean().default(false).describe("Override rate limit checks"),
});

export const analyzeFormulaNotesSchema = z.object({
  client_id_list: z.array(z.string()).min(1, "At least one client ID required"),
  force: z.boolean().default(false).describe("Override rate limit checks"),
});

export const writeClientProfileSchema = z.object({
  client_id: z.string().min(1, "Client ID is required"),
  data: z.record(z.unknown()).describe("JSON object with client data to update"),
  dry_run: z.boolean().default(true).describe("If true, only show what would be updated"),
  force: z.boolean().default(false).describe("Override rate limit checks"),
});


export async function handleSyncClients(
  args: z.infer<typeof syncClientsSchema>,
  syncService: SyncService
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const result = await syncService.syncClients({
      status: args.status,
      sinceDate: args.since_date,
      force: args.force,
    });

    let message = `Successfully synced ${result.totalSynced} clients.`;

    if (result.errors.length > 0) {
      message += `\n\nWarnings:\n${result.errors.join("\n")}`;
    }

    return {
      content: [{ type: "text", text: message }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error syncing clients: ${errorMessage}` }],
    };
  }
}

export async function handleExportSalesHistory(
  args: z.infer<typeof exportSalesHistorySchema>,
  syncService: SyncService,
  db: DatabaseClient,
  config: Config
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    // First sync the sales data
    const result = await syncService.syncSales({
      startDate: args.start_date,
      endDate: args.end_date,
      force: args.force,
    });

    // Get the sales from the database
    const sales = db["db"].query(`
      SELECT id, sale_date, client_id, total_amount, raw_data
      FROM sales
      WHERE sale_date BETWEEN ? AND ?
      ORDER BY sale_date
    `).all(args.start_date, args.end_date) as Array<{
      id: string;
      sale_date: string;
      client_id: string | null;
      total_amount: number | null;
      raw_data: string;
    }>;

    // Export to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `sales_export_${timestamp}.${args.format}`;
    const filepath = join(config.DATA_DIR, filename);

    if (args.format === "json") {
      const data = sales.map((sale) => ({
        id: sale.id,
        saleDate: sale.sale_date,
        clientId: sale.client_id,
        totalAmount: sale.total_amount,
        ...JSON.parse(sale.raw_data) as Record<string, unknown>,
      }));
      await Bun.write(filepath, JSON.stringify(data, null, 2));
    } else {
      // CSV format
      const headers = "ID,Sale Date,Client ID,Total Amount\n";
      const rows = sales.map((sale) =>
        `${sale.id},${sale.sale_date},${sale.client_id ?? ""},${sale.total_amount ?? ""}`
      ).join("\n");
      await Bun.write(filepath, headers + rows);
    }

    let message = `Successfully exported ${sales.length} sales records to ${filename}`;

    if (result.errors.length > 0) {
      message += `\n\nWarnings during sync:\n${result.errors.join("\n")}`;
    }

    return {
      content: [{ type: "text", text: message }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error exporting sales: ${errorMessage}` }],
    };
  }
}

export async function handleAnalyzeFormulaNotes(
  args: z.infer<typeof analyzeFormulaNotesSchema>,
  apiClient: MindbodyApiClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const result = await apiClient.getClientFormulaNotes({
      clientIds: args.client_id_list,
      force: args.force,
    });

    const notes = result.ClientFormulaNotes ?? [];

    if (notes.length === 0) {
      return {
        content: [{ type: "text", text: "No formula notes found for the specified clients." }],
      };
    }

    // Analyze notes for patterns
    const analyzed = notes.map((note) => {
      const noteText = note.Notes || "";
      const patterns: string[] = [];

      // Detect potential hair color formulas
      if (/\d+[a-zA-Z]+\s*\+\s*\d+[a-zA-Z]+/i.test(noteText)) {
        patterns.push("Hair color formula detected");
      }

      // Detect medical/PII
      if (/medical|allergies|health|medication/i.test(noteText)) {
        patterns.push("⚠️  Contains potential medical/sensitive information");
      }

      return {
        clientId: note.ClientId,
        notes: noteText,
        patterns: patterns.length > 0 ? patterns : ["No specific patterns detected"],
      };
    });

    const output = analyzed.map((item) =>
      `Client ID: ${item.clientId}\nNotes: ${item.notes}\nAnalysis: ${item.patterns.join(", ")}\n`
    ).join("\n---\n\n");

    return {
      content: [{ type: "text", text: output }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error analyzing formula notes: ${errorMessage}` }],
    };
  }
}

export async function handleWriteClientProfile(
  args: z.infer<typeof writeClientProfileSchema>,
  apiClient: MindbodyApiClient
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    if (args.dry_run) {
      const preview = {
        clientId: args.client_id,
        changes: args.data,
        warning: "This is a DRY RUN. No changes will be made. Set dry_run: false to apply.",
      };

      return {
        content: [
          {
            type: "text",
            text: `DRY RUN - Preview of changes:\n\n${JSON.stringify(preview, null, 2)}`,
          },
        ],
      };
    }

    // Actually update the client
    const result = await apiClient.updateClient({
      clientId: args.client_id,
      data: args.data,
      force: args.force,
    });

    return {
      content: [
        {
          type: "text",
          text: `Successfully updated client ${args.client_id}\n\nUpdated data:\n${JSON.stringify(result.Client, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error updating client profile: ${errorMessage}` }],
    };
  }
}

export async function handleGetAppointments(
  args: z.infer<typeof getAppointmentsSchema>,
  appointmentService: AppointmentService
): Promise<{ content: Array<{ type: string; text: string }> }> {
  try {
    const result = await appointmentService.getAppointments(args);

    const { appointments, pagination } = result;

    if (appointments.length === 0) {
      return {
        content: [{
          type: "text",
          text: "No appointments found for the specified criteria.",
        }],
      };
    }

    // Format appointments for display
    const formattedAppointments = appointments.map((apt) => {
      const clientName = apt.client
        ? `${apt.client.firstName || ""} ${apt.client.lastName || ""}`.trim() || "Unknown Client"
        : "No Client";

      const staffName = apt.staff
        ? `${apt.staff.firstName || ""} ${apt.staff.lastName || ""}`.trim() || "Unknown Staff"
        : "No Staff";

      const location = apt.location?.name || "No Location";
      const sessionType = apt.sessionType?.name || "No Type";

      return {
        id: apt.id,
        startDateTime: apt.startDateTime,
        endDateTime: apt.endDateTime,
        client: clientName,
        staff: staffName,
        location,
        sessionType,
        status: apt.status || "Unknown",
      };
    });

    let message = `Found ${appointments.length} appointment(s):\n\n`;
    message += JSON.stringify(formattedAppointments, null, 2);

    if (pagination) {
      message += `\n\nPagination Info:\n`;
      message += `- Showing ${pagination.pageSize} of ${pagination.totalResults} total results\n`;
      message += `- Current offset: ${pagination.offset}\n`;
      message += `- Requested limit: ${pagination.limit}`;
    }

    return {
      content: [{ type: "text", text: message }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error fetching appointments: ${errorMessage}` }],
    };
  }
}
