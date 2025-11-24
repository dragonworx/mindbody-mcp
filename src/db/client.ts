import { Database } from "bun:sqlite";
import { SCHEMA_SQL } from "./schema.js";
import type { Config } from "../config.js";
import { join } from "path";

export class DatabaseClient {
  private db: Database;

  constructor(config: Config) {
    const dbPath = join(config.DATA_DIR, "mindbody.db");
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize(): void {
    // Enable WAL mode for better concurrent access
    this.db.exec("PRAGMA journal_mode = WAL");

    // Create tables
    this.db.exec(SCHEMA_SQL);
  }

  saveClient(client: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    status?: string;
    rawData: unknown;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO clients (id, first_name, last_name, email, status, raw_data, last_synced_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        email = excluded.email,
        status = excluded.status,
        raw_data = excluded.raw_data,
        last_synced_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      client.id,
      client.firstName ?? null,
      client.lastName ?? null,
      client.email ?? null,
      client.status ?? null,
      JSON.stringify(client.rawData)
    );
  }

  saveClients(clients: Array<{
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    status?: string;
    rawData: unknown;
  }>): void {
    this.db.transaction(() => {
      for (const client of clients) {
        this.saveClient(client);
      }
    })();
  }

  getClients(status?: string): Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    status: string | null;
    lastSyncedAt: string;
  }> {
    let query = "SELECT id, first_name, last_name, email, status, last_synced_at FROM clients";

    if (status) {
      query += " WHERE status = ?";
      return this.db.query(query).all(status) as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        status: string | null;
        last_synced_at: string;
      }>;
    }

    return this.db.query(query).all() as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      status: string | null;
      last_synced_at: string;
    }>;
  }

  saveSale(sale: {
    id: string;
    saleDate: string;
    clientId?: string;
    totalAmount?: number;
    rawData: unknown;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO sales (id, sale_date, client_id, total_amount, raw_data, last_synced_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        sale_date = excluded.sale_date,
        client_id = excluded.client_id,
        total_amount = excluded.total_amount,
        raw_data = excluded.raw_data,
        last_synced_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      sale.id,
      sale.saleDate,
      sale.clientId ?? null,
      sale.totalAmount ?? null,
      JSON.stringify(sale.rawData)
    );
  }

  saveSales(sales: Array<{
    id: string;
    saleDate: string;
    clientId?: string;
    totalAmount?: number;
    rawData: unknown;
  }>): void {
    this.db.transaction(() => {
      for (const sale of sales) {
        this.saveSale(sale);
      }
    })();
  }

  getApiUsage(date: string): number {
    const result = this.db.query("SELECT count FROM api_usage WHERE date = ?").get(date) as { count: number } | null;
    return result?.count ?? 0;
  }

  incrementApiUsage(date: string): void {
    this.db.prepare(`
      INSERT INTO api_usage (date, count)
      VALUES (?, 1)
      ON CONFLICT(date) DO UPDATE SET count = count + 1
    `).run(date);
  }

  addSyncLog(log: {
    operation: string;
    status: "success" | "error" | "warning";
    message: string;
    details?: unknown;
  }): void {
    this.db.prepare(`
      INSERT INTO sync_logs (operation, status, message, details)
      VALUES (?, ?, ?, ?)
    `).run(
      log.operation,
      log.status,
      log.message,
      log.details ? JSON.stringify(log.details) : null
    );
  }

  getSyncLogs(limit = 50): Array<{
    id: number;
    timestamp: string;
    operation: string;
    status: string;
    message: string;
    details: string | null;
  }> {
    return this.db.query(`
      SELECT id, timestamp, operation, status, message, details
      FROM sync_logs
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as Array<{
      id: number;
      timestamp: string;
      operation: string;
      status: string;
      message: string;
      details: string | null;
    }>;
  }

  getCacheSummary(): {
    clients: number;
    sales: number;
    lastSync: string | null;
  } {
    const clientCount = this.db.query("SELECT COUNT(*) as count FROM clients").get() as { count: number };
    const salesCount = this.db.query("SELECT COUNT(*) as count FROM sales").get() as { count: number };
    const lastSync = this.db.query("SELECT MAX(last_synced_at) as last_sync FROM clients").get() as { last_sync: string | null };

    return {
      clients: clientCount.count,
      sales: salesCount.count,
      lastSync: lastSync.last_sync,
    };
  }

  close(): void {
    this.db.close();
  }
}
