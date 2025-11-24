import { z } from "zod";

// ============================================================================
// Runtime Validation Schemas (Zod)
// ============================================================================

/**
 * Zod schema for MinBody API Appointment response
 * Use this to validate API responses at runtime to catch schema changes
 */
export const MindbodyAppointmentSchema = z.object({
  Id: z.number(),
  StartDateTime: z.string(),
  EndDateTime: z.string(),
  ClientId: z.string().optional(),
  StaffId: z.number().optional(),
  LocationId: z.number().optional(),
  SessionTypeId: z.number().optional(),
  Status: z.enum([
    "None",
    "Requested",
    "Booked",
    "Completed",
    "Confirmed",
    "Arrived",
    "NoShow",
    "Cancelled",
    "LateCancelled",
  ]).optional(),
  Staff: z.object({
    Id: z.number(),
    FirstName: z.string().optional(),
    LastName: z.string().optional(),
    DisplayName: z.string().optional(),
  }).optional(),
  Duration: z.number().optional(),
  ClientServiceId: z.number().optional(),
  FirstAppointment: z.boolean().optional(),
  GenderPreference: z.enum(["None", "Female", "Male"]).optional(),
  IsWaitlist: z.boolean().optional(),
  Notes: z.string().optional(),
  OnlineDescription: z.string().optional(),
  PartnerExternalId: z.string().optional(),
  ProgramId: z.number().optional(),
  ProviderId: z.string().optional(),
  StaffRequested: z.boolean().optional(),
  WaitlistEntryId: z.number().optional(),
  AddOns: z.array(z.object({
    Id: z.number(),
    Name: z.string().optional(),
    StaffId: z.number().optional(),
    TypeId: z.number().optional(),
  })).optional(),
  Resources: z.array(z.object({
    Id: z.number(),
    Name: z.string().optional(),
  })).optional(),
});

/**
 * Zod schema for paginated appointment response
 */
export const PaginatedAppointmentResponseSchema = z.object({
  Appointments: z.array(MindbodyAppointmentSchema),
  PaginationResponse: z.object({
    RequestedLimit: z.number(),
    RequestedOffset: z.number(),
    PageSize: z.number(),
    TotalResults: z.number(),
  }).optional(),
});

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * MinBody API Appointment Response (Official Schema)
 *
 * IMPORTANT: This matches the REAL MinBody Public API v6 structure.
 * Generated from: https://api.mindbodyonline.com/public/v6/swagger/doc
 *
 * Key points:
 * - Id, StaffId, LocationId, SessionTypeId are NUMBERS (not strings!)
 * - ClientId is STRING (RSSID format)
 * - Client, Location, SessionType nested objects DO NOT EXIST in API response
 * - Staff nested object DOES exist with DisplayName field
 */
export interface MindbodyAppointment {
  /** Appointment ID (int64) */
  Id: number;
  /** ISO 8601 date-time */
  StartDateTime: string;
  /** ISO 8601 date-time */
  EndDateTime: string;
  /** Client RSSID (string format) */
  ClientId?: string;
  /** Staff ID (int64) */
  StaffId?: number;
  /** Location ID (int32) */
  LocationId?: number;
  /** Session Type ID (int32) */
  SessionTypeId?: number;
  /** Appointment status */
  Status?: "None" | "Requested" | "Booked" | "Completed" | "Confirmed" | "Arrived" | "NoShow" | "Cancelled" | "LateCancelled";
  /** Staff information (DOES exist in API) */
  Staff?: {
    Id: number;
    FirstName?: string;
    LastName?: string;
    DisplayName?: string;
  };
  /** Duration in minutes */
  Duration?: number;
  /** Client service ID (int64) */
  ClientServiceId?: number;
  /** Is this client's first appointment? */
  FirstAppointment?: boolean;
  /** Staff gender preference */
  GenderPreference?: "None" | "Female" | "Male";
  /** Is on waitlist? */
  IsWaitlist?: boolean;
  /** Appointment notes */
  Notes?: string;
  /** Online booking description */
  OnlineDescription?: string;
  /** External partner ID */
  PartnerExternalId?: string;
  /** Program ID (int32) */
  ProgramId?: number;
  /** Provider ID (CAM features) */
  ProviderId?: string;
  /** Was staff specifically requested? */
  StaffRequested?: boolean;
  /** Waitlist entry ID (int64) */
  WaitlistEntryId?: number;
  /** Appointment add-ons */
  AddOns?: Array<{
    Id: number;
    Name?: string;
    StaffId?: number;
    TypeId?: number;
  }>;
  /** Resources (rooms, equipment) */
  Resources?: Array<{
    Id: number;
    Name?: string;
  }>;
}

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

export interface PaginatedAppointmentResponse {
  Appointments: MindbodyAppointment[];
  PaginationResponse?: {
    RequestedLimit: number;
    RequestedOffset: number;
    PageSize: number;
    TotalResults: number;
  };
}

export function transformAppointment(mbAppointment: MindbodyAppointment): Appointment {
  return {
    // Convert number IDs to strings for database storage
    id: mbAppointment.Id.toString(),
    startDateTime: mbAppointment.StartDateTime,
    endDateTime: mbAppointment.EndDateTime,
    clientId: mbAppointment.ClientId ?? null,
    staffId: mbAppointment.StaffId?.toString() ?? null,
    locationId: mbAppointment.LocationId?.toString() ?? null,
    sessionTypeId: mbAppointment.SessionTypeId?.toString() ?? null,
    status: mbAppointment.Status ?? null,
    // NOTE: Client, Location, SessionType nested objects DO NOT exist in real API
    // These will always be null - use the ID fields above to fetch related data separately
    client: null,
    staff: mbAppointment.Staff ? {
      id: mbAppointment.Staff.Id.toString(),
      firstName: mbAppointment.Staff.FirstName ?? null,
      lastName: mbAppointment.Staff.LastName ?? null,
    } : null,
    location: null,
    sessionType: null,
    rawData: mbAppointment,
    lastSyncedAt: new Date().toISOString(),
  };
}

export interface MindbodyBookableItem {
  Id: string;
  Name?: string;
  SessionType?: {
    Id: string;
    Name?: string;
    DefaultTimeLength?: number;
  };
  Pricing?: {
    Price?: number;
    OnlinePrice?: number;
    TaxIncluded?: number;
  };
  ProgramId?: string;
  Program?: {
    Id: string;
    Name?: string;
  };
  LocationIds?: string[];
  Locations?: Array<{
    Id: string;
    Name?: string;
  }>;
  StaffMembers?: Array<{
    Id: string;
    FirstName?: string;
    LastName?: string;
    ImageUrl?: string;
  }>;
  [key: string]: unknown;
}

export interface BookableItem {
  id: string;
  name: string | null;
  sessionType: {
    id: string;
    name: string | null;
    defaultTimeLength: number | null;
  } | null;
  pricing: {
    price: number | null;
    onlinePrice: number | null;
    taxIncluded: number | null;
  } | null;
  programId: string | null;
  program: {
    id: string;
    name: string | null;
  } | null;
  locationIds: string[];
  locations: Array<{
    id: string;
    name: string | null;
  }>;
  staffMembers: Array<{
    id: string;
    firstName: string | null;
    lastName: string | null;
    imageUrl: string | null;
  }>;
  rawData: MindbodyBookableItem;
  lastSyncedAt: string;
}

export const GetBookableItemsParamsSchema = z.object({
  locationIds: z.array(z.string()).optional(),
  programIds: z.array(z.string()).optional(),
  sessionTypeIds: z.array(z.string()).optional(),
  staffIds: z.array(z.string()).optional(),
  limit: z.number().min(1).max(200).default(100),
  offset: z.number().min(0).default(0),
  force: z.boolean().default(false),
});

export type GetBookableItemsParams = z.infer<typeof GetBookableItemsParamsSchema>;

// ============================================================================
// Runtime Validation Helpers
// ============================================================================

/**
 * Validate an appointment response from the MinBody API
 *
 * Use this in production to catch API schema changes early.
 * If validation fails, it logs the error and returns false.
 *
 * @example
 * const response = await mindbodyClient.getAppointments(...);
 * if (!validateAppointmentResponse(response)) {
 *   console.error('API schema has changed! Check logs.');
 * }
 */
export function validateAppointmentResponse(
  response: unknown,
  options: { throwOnError?: boolean; logErrors?: boolean } = {}
): response is PaginatedAppointmentResponse {
  const { throwOnError = false, logErrors = true } = options;

  try {
    PaginatedAppointmentResponseSchema.parse(response);
    return true;
  } catch (error) {
    if (logErrors) {
      console.error("[MinBody API Validation Error] Appointment response schema mismatch:", error);
    }
    if (throwOnError) {
      throw error;
    }
    return false;
  }
}

/**
 * Validate a single appointment object
 */
export function validateAppointment(
  appointment: unknown,
  options: { throwOnError?: boolean; logErrors?: boolean } = {}
): appointment is MindbodyAppointment {
  const { throwOnError = false, logErrors = true } = options;

  try {
    MindbodyAppointmentSchema.parse(appointment);
    return true;
  } catch (error) {
    if (logErrors) {
      console.error("[MinBody API Validation Error] Appointment schema mismatch:", error);
    }
    if (throwOnError) {
      throw error;
    }
    return false;
  }
}

export interface PaginatedBookableItemResponse {
  BookableItems: MindbodyBookableItem[];
  PaginationResponse?: {
    RequestedLimit: number;
    RequestedOffset: number;
    PageSize: number;
    TotalResults: number;
  };
}

export function transformBookableItem(mbItem: MindbodyBookableItem): BookableItem {
  return {
    id: mbItem.Id,
    name: mbItem.Name ?? null,
    sessionType: mbItem.SessionType ? {
      id: mbItem.SessionType.Id,
      name: mbItem.SessionType.Name ?? null,
      defaultTimeLength: mbItem.SessionType.DefaultTimeLength ?? null,
    } : null,
    pricing: mbItem.Pricing ? {
      price: mbItem.Pricing.Price ?? null,
      onlinePrice: mbItem.Pricing.OnlinePrice ?? null,
      taxIncluded: mbItem.Pricing.TaxIncluded ?? null,
    } : null,
    programId: mbItem.ProgramId ?? null,
    program: mbItem.Program ? {
      id: mbItem.Program.Id,
      name: mbItem.Program.Name ?? null,
    } : null,
    locationIds: mbItem.LocationIds ?? [],
    locations: mbItem.Locations?.map(loc => ({
      id: loc.Id,
      name: loc.Name ?? null,
    })) ?? [],
    staffMembers: mbItem.StaffMembers?.map(staff => ({
      id: staff.Id,
      firstName: staff.FirstName ?? null,
      lastName: staff.LastName ?? null,
      imageUrl: staff.ImageUrl ?? null,
    })) ?? [],
    rawData: mbItem,
    lastSyncedAt: new Date().toISOString(),
  };
}
