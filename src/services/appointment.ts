import type { DatabaseClient } from "../db/client.js";
import type { MindbodyApiClient } from "./mindbody.js";
import {
  type Appointment,
  type GetAppointmentsParams,
  type MindbodyAppointment,
  type PaginatedAppointmentResponse,
  transformAppointment,
  GetAppointmentsParamsSchema,
} from "../types/appointment.js";

/**
 * Cache TTL for appointments (1 hour)
 */
const CACHE_TTL_SECONDS = 3600;

/**
 * Generate a cache key for appointment queries
 */
function generateCacheKey(params: GetAppointmentsParams): string {
  const parts = [
    `appointments`,
    params.startDate,
    params.endDate || "no-end",
    params.staffIds?.join(",") || "all-staff",
    params.locationIds?.join(",") || "all-locations",
    params.clientIds?.join(",") || "all-clients",
    params.limit.toString(),
    params.offset.toString(),
  ];
  return parts.join(":");
}

/**
 * Service for managing appointments with caching
 */
export class AppointmentService {
  constructor(
    private apiClient: MindbodyApiClient,
    private db: DatabaseClient
  ) {}

  /**
   * Get appointments from cache or API
   *
   * @param params - Filter parameters for appointments
   * @returns Array of appointments with client, staff, and service details
   *
   * @example
   * ```typescript
   * const appointments = await service.getAppointments({
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31',
   *   limit: 50,
   * });
   * ```
   */
  async getAppointments(params: GetAppointmentsParams): Promise<{
    appointments: Appointment[];
    pagination?: {
      limit: number;
      offset: number;
      pageSize: number;
      totalResults: number;
    };
  }> {
    // Validate parameters
    const validatedParams = GetAppointmentsParamsSchema.parse(params);

    // Check cache first (unless force is true)
    if (!validatedParams.force) {
      const cached = await this.getFromCache(validatedParams);
      if (cached) {
        return cached;
      }
    }

    // Fetch from API
    const response = await this.apiClient.getAppointments({
      startDate: validatedParams.startDate,
      endDate: validatedParams.endDate,
      staffIds: validatedParams.staffIds,
      locationIds: validatedParams.locationIds,
      clientIds: validatedParams.clientIds,
      limit: validatedParams.limit,
      offset: validatedParams.offset,
      force: validatedParams.force,
    });

    // Transform and store appointments
    const appointments = response.Appointments.map(transformAppointment);
    await this.storeAppointments(appointments);

    // Cache the result
    const result = {
      appointments,
      pagination: response.PaginationResponse ? {
        limit: response.PaginationResponse.RequestedLimit,
        offset: response.PaginationResponse.RequestedOffset,
        pageSize: response.PaginationResponse.PageSize,
        totalResults: response.PaginationResponse.TotalResults,
      } : undefined,
    };

    await this.setCache(validatedParams, result);

    return result;
  }

  /**
   * Get appointments from cache
   */
  private async getFromCache(params: GetAppointmentsParams): Promise<{
    appointments: Appointment[];
    pagination?: {
      limit: number;
      offset: number;
      pageSize: number;
      totalResults: number;
    };
  } | null> {
    const cacheKey = generateCacheKey(params);
    const cached = this.db.db.prepare(
      `SELECT value, expires_at FROM cache WHERE key = ?`
    ).get(cacheKey) as { value: string; expires_at: number } | undefined;

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expires_at) {
      // Delete expired entry
      this.db.db.prepare(`DELETE FROM cache WHERE key = ?`).run(cacheKey);
      return null;
    }

    // Increment hit count
    this.db.db.prepare(
      `UPDATE cache SET hit_count = hit_count + 1 WHERE key = ?`
    ).run(cacheKey);

    return JSON.parse(cached.value);
  }

  /**
   * Store result in cache
   */
  private async setCache(
    params: GetAppointmentsParams,
    result: {
      appointments: Appointment[];
      pagination?: {
        limit: number;
        offset: number;
        pageSize: number;
        totalResults: number;
      };
    }
  ): Promise<void> {
    const cacheKey = generateCacheKey(params);
    const expiresAt = Date.now() + CACHE_TTL_SECONDS * 1000;
    const value = JSON.stringify(result);

    this.db.db.prepare(
      `INSERT OR REPLACE INTO cache (key, value, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    ).run(cacheKey, value, expiresAt, Date.now());
  }

  /**
   * Store appointments in database
   */
  private async storeAppointments(appointments: Appointment[]): Promise<void> {
    const stmt = this.db.db.prepare(
      `INSERT OR REPLACE INTO appointments
       (id, start_date_time, end_date_time, client_id, staff_id, location_id,
        session_type_id, status, raw_data, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    for (const appointment of appointments) {
      stmt.run(
        appointment.id,
        appointment.startDateTime,
        appointment.endDateTime,
        appointment.clientId,
        appointment.staffId,
        appointment.locationId,
        appointment.sessionTypeId,
        appointment.status,
        JSON.stringify(appointment.rawData),
        appointment.lastSyncedAt
      );
    }
  }

  /**
   * Clear appointment cache (useful after booking/canceling appointments)
   */
  async clearCache(pattern?: string): Promise<number> {
    if (pattern) {
      const result = this.db.db.prepare(
        `DELETE FROM cache WHERE key LIKE ?`
      ).run(`${pattern}%`);
      return result.changes;
    } else {
      const result = this.db.db.prepare(
        `DELETE FROM cache WHERE key LIKE 'appointments%'`
      ).run();
      return result.changes;
    }
  }

  /**
   * Prune expired cache entries
   */
  async pruneCache(): Promise<number> {
    const result = this.db.db.prepare(
      `DELETE FROM cache WHERE expires_at < ?`
    ).run(Date.now());
    return result.changes;
  }
}
