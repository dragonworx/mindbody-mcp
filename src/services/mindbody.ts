import type { Config } from "../config.js";
import { MINDBODY_API_BASE } from "../config.js";
import { AuthService } from "./auth.js";
import { RateLimitGuard } from "./rateLimit.js";

interface MindbodyRequestOptions {
  method?: string;
  endpoint: string;
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  force?: boolean;
}

interface MindbodyClient {
  Id: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Status?: string;
  CreationDate?: string;
  [key: string]: unknown;
}

interface MindbodySale {
  Id: string;
  SaleDate?: string;
  ClientId?: string;
  TotalAmount?: number;
  [key: string]: unknown;
}

interface PaginatedResponse<T> {
  PaginationResponse?: {
    RequestedLimit: number;
    RequestedOffset: number;
    PageSize: number;
    TotalResults: number;
  };
  [key: string]: T[] | unknown;
}

/**
 * Mindbody API client with automatic authentication and rate limiting
 */
export class MindbodyApiClient {
  private authService: AuthService;
  private rateLimitGuard: RateLimitGuard;

  constructor(
    config: Config,
    rateLimitGuard: RateLimitGuard,
    authService?: AuthService
  ) {
    this.authService = authService || new AuthService(config);
    this.rateLimitGuard = rateLimitGuard;
  }

  /**
   * Make an authenticated request to the Mindbody API
   */
  private async request<T>(options: MindbodyRequestOptions): Promise<T> {
    const { method = "GET", endpoint, params, body, force = false } = options;

    // Check rate limit
    await this.rateLimitGuard.checkLimit(force);

    // Get authentication token
    const token = await this.authService.getUserToken();

    // Build URL with query params
    const url = new URL(`${MINDBODY_API_BASE}${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    // Make request
    const response = await fetch(url.toString(), {
      method,
      headers: {
        "Content-Type": "application/json",
        "Api-Key": this.authService["config"].MBO_API_KEY,
        "SiteId": this.authService["config"].MBO_SITE_ID,
        "Authorization": `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Record the API call
    this.rateLimitGuard.recordCall();

    // Handle 401/403 by invalidating token and retrying once
    if (response.status === 401 || response.status === 403) {
      this.authService.invalidateToken();
      const newToken = await this.authService.getUserToken();

      const retryResponse = await fetch(url.toString(), {
        method,
        headers: {
          "Content-Type": "application/json",
          "Api-Key": this.authService["config"].MBO_API_KEY,
          "SiteId": this.authService["config"].MBO_SITE_ID,
          "Authorization": `Bearer ${newToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      this.rateLimitGuard.recordCall();

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(`API request failed after retry: ${retryResponse.status} - ${errorText}`);
      }

      return await retryResponse.json() as T;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return await response.json() as T;
  }

  /**
   * Get clients with pagination
   */
  async getClients(params: {
    limit?: number;
    offset?: number;
    status?: string;
    force?: boolean;
  }): Promise<PaginatedResponse<MindbodyClient>> {
    return this.request<PaginatedResponse<MindbodyClient>>({
      endpoint: "/client/clients",
      params: {
        limit: params.limit ?? 100,
        offset: params.offset ?? 0,
        ...(params.status && { status: params.status }),
      },
      force: params.force,
    });
  }

  /**
   * Get sales data with pagination
   */
  async getSales(params: {
    startDate: string;
    endDate: string;
    limit?: number;
    offset?: number;
    force?: boolean;
  }): Promise<PaginatedResponse<MindbodySale>> {
    return this.request<PaginatedResponse<MindbodySale>>({
      endpoint: "/sale/sales",
      params: {
        StartSaleDateTime: params.startDate,
        EndSaleDateTime: params.endDate,
        limit: params.limit ?? 100,
        offset: params.offset ?? 0,
      },
      force: params.force,
    });
  }

  /**
   * Get client formula notes
   */
  async getClientFormulaNotes(params: {
    clientIds: string[];
    force?: boolean;
  }): Promise<{ ClientFormulaNotes: Array<{ ClientId: string; Notes: string; [key: string]: unknown }> }> {
    return this.request({
      endpoint: "/client/clientformulanotes",
      params: {
        ClientIds: params.clientIds.join(","),
      },
      force: params.force,
    });
  }

  /**
   * Update a client profile
   */
  async updateClient(params: {
    clientId: string;
    data: Record<string, unknown>;
    force?: boolean;
  }): Promise<{ Client: MindbodyClient }> {
    return this.request({
      method: "POST",
      endpoint: "/client/updateclient",
      body: {
        ClientId: params.clientId,
        ...params.data,
      },
      force: params.force,
    });
  }

  /**
   * Get appointments from Mindbody API with filtering and pagination
   *
   * Retrieves appointments for a specified date range with optional
   * filtering by staff, location, or client. Supports pagination for
   * large result sets.
   *
   * @param params - Query parameters for filtering appointments
   * @param params.startDate - Start date in YYYY-MM-DD format (required)
   * @param params.endDate - End date in YYYY-MM-DD format (optional)
   * @param params.staffIds - Filter by specific staff member IDs (optional)
   * @param params.locationIds - Filter by specific location IDs (optional)
   * @param params.clientIds - Filter by specific client IDs (optional)
   * @param params.limit - Number of results to return (default: 100, max: 200)
   * @param params.offset - Number of results to skip for pagination (default: 0)
   * @param params.force - Bypass rate limit checks (default: false)
   *
   * @returns Promise resolving to appointments and pagination metadata
   *
   * @throws {Error} If API request fails or rate limit is exceeded
   *
   * @example
   * ```typescript
   * const response = await client.getAppointments({
   *   startDate: '2024-01-01',
   *   endDate: '2024-01-31',
   *   staffIds: ['staff-1'],
   *   limit: 50,
   * });
   * console.log(response.Appointments.length); // Number of appointments
   * console.log(response.PaginationResponse?.TotalResults); // Total count
   * ```
   */
  async getAppointments(params: {
    startDate: string;
    endDate?: string;
    staffIds?: string[];
    locationIds?: string[];
    clientIds?: string[];
    limit?: number;
    offset?: number;
    force?: boolean;
  }): Promise<{
    Appointments: Array<{
      Id: string;
      StartDateTime: string;
      EndDateTime: string;
      ClientId?: string;
      StaffId?: string;
      LocationId?: string;
      SessionTypeId?: string;
      Status?: string;
      [key: string]: unknown;
    }>;
    PaginationResponse?: {
      RequestedLimit: number;
      RequestedOffset: number;
      PageSize: number;
      TotalResults: number;
    };
  }> {
    const queryParams: Record<string, string | number | boolean | undefined> = {
      StartDate: params.startDate,
      EndDate: params.endDate,
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
    };

    if (params.staffIds && params.staffIds.length > 0) {
      queryParams.StaffIds = params.staffIds.join(",");
    }
    if (params.locationIds && params.locationIds.length > 0) {
      queryParams.LocationIds = params.locationIds.join(",");
    }
    if (params.clientIds && params.clientIds.length > 0) {
      queryParams.ClientIds = params.clientIds.join(",");
    }

    return this.request({
      endpoint: "/appointment/appointments",
      params: queryParams,
      force: params.force,
    });
  }

  /**
   * Get rate limit guard for external use
   */
  getRateLimitGuard(): RateLimitGuard {
    return this.rateLimitGuard;
  }
}
