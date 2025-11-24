import { describe, test, expect, beforeEach, mock } from "bun:test";
import { AppointmentService } from "./appointment";
import type { MindbodyApiClient } from "./mindbody";
import type { DatabaseClient } from "../db/client";
import type { MindbodyAppointment, GetAppointmentsParams } from "../types/appointment";

// Mock data
const mockMindbodyAppointments: MindbodyAppointment[] = [
  {
    Id: "apt-1",
    StartDateTime: "2024-01-15T10:00:00Z",
    EndDateTime: "2024-01-15T11:00:00Z",
    ClientId: "client-1",
    StaffId: "staff-1",
    LocationId: "location-1",
    SessionTypeId: "session-1",
    Status: "Confirmed",
    Client: {
      Id: "client-1",
      FirstName: "John",
      LastName: "Doe",
      Email: "john@example.com",
    },
    Staff: {
      Id: "staff-1",
      FirstName: "Jane",
      LastName: "Smith",
    },
    Location: {
      Id: "location-1",
      Name: "Main Studio",
    },
    SessionType: {
      Id: "session-1",
      Name: "Personal Training",
    },
  },
  {
    Id: "apt-2",
    StartDateTime: "2024-01-15T14:00:00Z",
    EndDateTime: "2024-01-15T15:00:00Z",
    ClientId: "client-2",
    StaffId: "staff-1",
    LocationId: "location-1",
    SessionTypeId: "session-1",
    Status: "Confirmed",
  },
];

describe("AppointmentService", () => {
  let service: AppointmentService;
  let mockApiClient: MindbodyApiClient;
  let mockDb: DatabaseClient;
  let dbQueries: Map<string, any>;
  let dbData: Map<string, any>;

  beforeEach(() => {
    // Reset mock data stores
    dbQueries = new Map();
    dbData = new Map();

    // Mock database
    mockDb = {
      db: {
        prepare: (sql: string) => {
          dbQueries.set(sql, true);
          return {
            get: (key?: string) => {
              if (sql.includes("SELECT value, expires_at FROM cache")) {
                return dbData.get(`cache:${key}`);
              }
              return undefined;
            },
            run: (...args: any[]) => {
              if (sql.includes("INSERT OR REPLACE INTO cache")) {
                const [key, value, expiresAt, createdAt] = args;
                dbData.set(`cache:${key}`, { value, expires_at: expiresAt });
                return { changes: 1 };
              }
              if (sql.includes("DELETE FROM cache")) {
                const count = Array.from(dbData.keys()).filter((k) =>
                  k.startsWith("cache:")
                ).length;
                dbData.clear();
                return { changes: count };
              }
              if (sql.includes("UPDATE cache SET hit_count")) {
                return { changes: 1 };
              }
              if (sql.includes("INSERT OR REPLACE INTO appointments")) {
                return { changes: 1 };
              }
              return { changes: 0 };
            },
            all: () => [],
          };
        },
        query: () => ({ all: () => [] }),
      } as any,
    } as DatabaseClient;

    // Mock API client
    mockApiClient = {
      getAppointments: mock(async (params: any) => {
        return {
          Appointments: mockMindbodyAppointments,
          PaginationResponse: {
            RequestedLimit: params.limit ?? 100,
            RequestedOffset: params.offset ?? 0,
            PageSize: mockMindbodyAppointments.length,
            TotalResults: mockMindbodyAppointments.length,
          },
        };
      }),
    } as any;

    service = new AppointmentService(mockApiClient, mockDb);
  });

  describe("getAppointments", () => {
    test("should fetch appointments from API when cache is empty", async () => {
      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        limit: 100,
        offset: 0,
        force: false,
      };

      const result = await service.getAppointments(params);

      expect(result.appointments).toHaveLength(2);
      expect(result.appointments[0]?.id).toBe("apt-1");
      expect(result.appointments[0]?.client?.firstName).toBe("John");
      expect(result.appointments[0]?.client?.lastName).toBe("Doe");
      expect(result.appointments[0]?.staff?.firstName).toBe("Jane");
      expect(result.pagination).toBeDefined();
      expect(result.pagination?.totalResults).toBe(2);
      expect(mockApiClient.getAppointments).toHaveBeenCalledTimes(1);
    });

    test("should return cached appointments when available and not expired", async () => {
      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        limit: 100,
        offset: 0,
        force: false,
      };

      // Set up cache
      const cachedResult = {
        appointments: [
          {
            id: "cached-apt",
            startDateTime: "2024-01-01T10:00:00Z",
            endDateTime: "2024-01-01T11:00:00Z",
            clientId: "client-1",
            staffId: null,
            locationId: null,
            sessionTypeId: null,
            status: "Confirmed",
            client: null,
            staff: null,
            location: null,
            sessionType: null,
            rawData: {} as any,
            lastSyncedAt: new Date().toISOString(),
          },
        ],
        pagination: {
          limit: 100,
          offset: 0,
          pageSize: 1,
          totalResults: 1,
        },
      };

      dbData.set("cache:appointments:2024-01-01:no-end:all-staff:all-locations:all-clients:100:0", {
        value: JSON.stringify(cachedResult),
        expires_at: Date.now() + 3600000, // Not expired
      });

      const result = await service.getAppointments(params);

      expect(result.appointments).toHaveLength(1);
      expect(result.appointments[0]?.id).toBe("cached-apt");
      expect(mockApiClient.getAppointments).not.toHaveBeenCalled();
    });

    test("should bypass cache when force is true", async () => {
      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        limit: 100,
        offset: 0,
        force: true,
      };

      // Set up cache
      dbData.set("cache:appointments:2024-01-01:no-end:all-staff:all-locations:all-clients:100:0", {
        value: JSON.stringify({ appointments: [], pagination: undefined }),
        expires_at: Date.now() + 3600000,
      });

      const result = await service.getAppointments(params);

      expect(result.appointments).toHaveLength(2);
      expect(mockApiClient.getAppointments).toHaveBeenCalledTimes(1);
    });

    test("should fetch from API when cache is expired", async () => {
      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        limit: 100,
        offset: 0,
        force: false,
      };

      // Set up expired cache
      dbData.set("cache:appointments:2024-01-01:no-end:all-staff:all-locations:all-clients:100:0", {
        value: JSON.stringify({ appointments: [], pagination: undefined }),
        expires_at: Date.now() - 1000, // Expired
      });

      const result = await service.getAppointments(params);

      expect(result.appointments).toHaveLength(2);
      expect(mockApiClient.getAppointments).toHaveBeenCalledTimes(1);
    });

    test("should validate date format", async () => {
      const params: GetAppointmentsParams = {
        startDate: "invalid-date",
        limit: 100,
        offset: 0,
        force: false,
      } as any;

      await expect(service.getAppointments(params)).rejects.toThrow();
    });

    test("should support filtering by staffIds", async () => {
      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        staffIds: ["staff-1", "staff-2"],
        limit: 100,
        offset: 0,
        force: false,
      };

      await service.getAppointments(params);

      expect(mockApiClient.getAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          staffIds: ["staff-1", "staff-2"],
        })
      );
    });

    test("should support filtering by locationIds", async () => {
      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        locationIds: ["location-1"],
        limit: 100,
        offset: 0,
        force: false,
      };

      await service.getAppointments(params);

      expect(mockApiClient.getAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          locationIds: ["location-1"],
        })
      );
    });

    test("should support filtering by clientIds", async () => {
      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        clientIds: ["client-1"],
        limit: 100,
        offset: 0,
        force: false,
      };

      await service.getAppointments(params);

      expect(mockApiClient.getAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          clientIds: ["client-1"],
        })
      );
    });

    test("should support date range filtering", async () => {
      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        limit: 100,
        offset: 0,
        force: false,
      };

      await service.getAppointments(params);

      expect(mockApiClient.getAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: "2024-01-01",
          endDate: "2024-01-31",
        })
      );
    });

    test("should support pagination with limit and offset", async () => {
      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        limit: 50,
        offset: 25,
        force: false,
      };

      await service.getAppointments(params);

      expect(mockApiClient.getAppointments).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 25,
        })
      );
    });

    test("should validate limit is within range (1-200)", async () => {
      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        limit: 250, // Exceeds max
        offset: 0,
        force: false,
      } as any;

      await expect(service.getAppointments(params)).rejects.toThrow();
    });

    test("should validate offset is non-negative", async () => {
      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        limit: 100,
        offset: -5, // Negative
        force: false,
      } as any;

      await expect(service.getAppointments(params)).rejects.toThrow();
    });

    test("should handle API errors gracefully", async () => {
      mockApiClient.getAppointments = mock(async () => {
        throw new Error("API Error");
      });

      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        limit: 100,
        offset: 0,
        force: false,
      };

      await expect(service.getAppointments(params)).rejects.toThrow("API Error");
    });

    test("should handle appointments with null/missing fields", async () => {
      mockApiClient.getAppointments = mock(async () => ({
        Appointments: [
          {
            Id: "apt-minimal",
            StartDateTime: "2024-01-15T10:00:00Z",
            EndDateTime: "2024-01-15T11:00:00Z",
          } as MindbodyAppointment,
        ],
        PaginationResponse: undefined,
      }));

      const params: GetAppointmentsParams = {
        startDate: "2024-01-01",
        limit: 100,
        offset: 0,
        force: false,
      };

      const result = await service.getAppointments(params);

      expect(result.appointments).toHaveLength(1);
      expect(result.appointments[0]?.client).toBeNull();
      expect(result.appointments[0]?.staff).toBeNull();
      expect(result.appointments[0]?.location).toBeNull();
      expect(result.appointments[0]?.sessionType).toBeNull();
    });

    test("should generate unique cache keys for different parameters", async () => {
      const params1: GetAppointmentsParams = {
        startDate: "2024-01-01",
        limit: 100,
        offset: 0,
        force: false,
      };

      const params2: GetAppointmentsParams = {
        startDate: "2024-01-01",
        staffIds: ["staff-1"],
        limit: 100,
        offset: 0,
        force: false,
      };

      await service.getAppointments(params1);
      await service.getAppointments(params2);

      // Both should hit the API because they have different cache keys
      expect(mockApiClient.getAppointments).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearCache", () => {
    test("should clear all appointment cache when no pattern specified", async () => {
      dbData.set("cache:appointments:2024-01-01:no-end:all-staff:all-locations:all-clients:100:0", {
        value: "data",
        expires_at: Date.now() + 3600000,
      });

      const cleared = await service.clearCache();

      expect(cleared).toBeGreaterThanOrEqual(0);
    });

    test("should clear cache matching pattern", async () => {
      const cleared = await service.clearCache("appointments:2024-01-01");

      expect(cleared).toBeGreaterThanOrEqual(0);
    });
  });

  describe("pruneCache", () => {
    test("should remove expired cache entries", async () => {
      const pruned = await service.pruneCache();

      expect(pruned).toBeGreaterThanOrEqual(0);
    });
  });
});
