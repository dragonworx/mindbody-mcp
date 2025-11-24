import type { Config } from "../config.js";
import { MINDBODY_API_BASE } from "../config.js";
import { AuthService } from "./auth.js";
import { RateLimitGuard } from "./rateLimit.js";
import type {
  MindbodyAppointment,
  PaginatedAppointmentResponse,
  MindbodyBookableItem,
  PaginatedBookableItemResponse,
} from "../types/appointment.js";

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

  async getAppointments(params: {
    startDate: string;
    endDate?: string;
    staffIds?: string[];
    locationIds?: string[];
    clientIds?: string[];
    limit?: number;
    offset?: number;
    force?: boolean;
  }): Promise<PaginatedAppointmentResponse> {
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

  async getBookableItems(params: {
    locationIds?: string[];
    programIds?: string[];
    sessionTypeIds?: string[];
    staffIds?: string[];
    limit?: number;
    offset?: number;
    force?: boolean;
  }): Promise<PaginatedBookableItemResponse> {
    const queryParams: Record<string, string | number | boolean | undefined> = {
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
    };

    if (params.locationIds && params.locationIds.length > 0) {
      queryParams.LocationIds = params.locationIds.join(",");
    }
    if (params.programIds && params.programIds.length > 0) {
      queryParams.ProgramIds = params.programIds.join(",");
    }
    if (params.sessionTypeIds && params.sessionTypeIds.length > 0) {
      queryParams.SessionTypeIds = params.sessionTypeIds.join(",");
    }
    if (params.staffIds && params.staffIds.length > 0) {
      queryParams.StaffIds = params.staffIds.join(",");
    }

    return this.request({
      endpoint: "/appointment/bookableItems",
      params: queryParams,
      force: params.force,
    });
  }

  getRateLimitGuard(): RateLimitGuard {
    return this.rateLimitGuard;
  }
}
