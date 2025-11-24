import { z } from "zod";

/**
 * Mindbody API appointment response structure
 */
export interface MindbodyAppointment {
  Id: string;
  StartDateTime: string;
  EndDateTime: string;
  ClientId?: string;
  StaffId?: string;
  LocationId?: string;
  SessionTypeId?: string;
  Status?: string;
  Client?: {
    Id: string;
    FirstName?: string;
    LastName?: string;
    Email?: string;
  };
  Staff?: {
    Id: string;
    FirstName?: string;
    LastName?: string;
  };
  Location?: {
    Id: string;
    Name?: string;
  };
  SessionType?: {
    Id: string;
    Name?: string;
  };
  [key: string]: unknown;
}

/**
 * Normalized appointment structure for internal use
 */
export interface Appointment {
  id: string;
  startDateTime: string;
  endDateTime: string;
  clientId: string | null;
  staffId: string | null;
  locationId: string | null;
  sessionTypeId: string | null;
  status: string | null;
  client: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  staff: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  location: {
    id: string;
    name: string | null;
  } | null;
  sessionType: {
    id: string;
    name: string | null;
  } | null;
  rawData: MindbodyAppointment;
  lastSyncedAt: string;
}

/**
 * Zod schema for validating appointment query parameters
 *
 * Validates all parameters for getting appointments including:
 * - Date formats (YYYY-MM-DD)
 * - Pagination limits (1-200)
 * - Filter arrays (staff, location, client IDs)
 */
export const GetAppointmentsParamsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  staffIds: z.array(z.string()).optional(),
  locationIds: z.array(z.string()).optional(),
  clientIds: z.array(z.string()).optional(),
  limit: z.number().min(1).max(200).default(100),
  offset: z.number().min(0).default(0),
  force: z.boolean().default(false),
});

export type GetAppointmentsParams = z.infer<typeof GetAppointmentsParamsSchema>;

/**
 * Paginated response from Mindbody API
 */
export interface PaginatedAppointmentResponse {
  Appointments: MindbodyAppointment[];
  PaginationResponse?: {
    RequestedLimit: number;
    RequestedOffset: number;
    PageSize: number;
    TotalResults: number;
  };
}

/**
 * Transform Mindbody API appointment response to internal format
 *
 * Converts PascalCase Mindbody fields to camelCase and normalizes
 * nested objects. Handles missing/null fields gracefully.
 *
 * @param mbAppointment - Raw appointment from Mindbody API
 * @returns Normalized appointment with all fields in camelCase
 *
 * @example
 * ```typescript
 * const mbApt = {
 *   Id: "123",
 *   StartDateTime: "2024-01-15T10:00:00Z",
 *   // ... other fields
 * };
 * const normalized = transformAppointment(mbApt);
 * console.log(normalized.id); // "123"
 * console.log(normalized.startDateTime); // "2024-01-15T10:00:00Z"
 * ```
 */
export function transformAppointment(mbAppointment: MindbodyAppointment): Appointment {
  return {
    id: mbAppointment.Id,
    startDateTime: mbAppointment.StartDateTime,
    endDateTime: mbAppointment.EndDateTime,
    clientId: mbAppointment.ClientId ?? null,
    staffId: mbAppointment.StaffId ?? null,
    locationId: mbAppointment.LocationId ?? null,
    sessionTypeId: mbAppointment.SessionTypeId ?? null,
    status: mbAppointment.Status ?? null,
    client: mbAppointment.Client ? {
      id: mbAppointment.Client.Id,
      firstName: mbAppointment.Client.FirstName ?? null,
      lastName: mbAppointment.Client.LastName ?? null,
      email: mbAppointment.Client.Email ?? null,
    } : null,
    staff: mbAppointment.Staff ? {
      id: mbAppointment.Staff.Id,
      firstName: mbAppointment.Staff.FirstName ?? null,
      lastName: mbAppointment.Staff.LastName ?? null,
    } : null,
    location: mbAppointment.Location ? {
      id: mbAppointment.Location.Id,
      name: mbAppointment.Location.Name ?? null,
    } : null,
    sessionType: mbAppointment.SessionType ? {
      id: mbAppointment.SessionType.Id,
      name: mbAppointment.SessionType.Name ?? null,
    } : null,
    rawData: mbAppointment,
    lastSyncedAt: new Date().toISOString(),
  };
}
