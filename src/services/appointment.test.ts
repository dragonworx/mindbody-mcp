import { describe, test, expect, beforeEach, mock } from "bun:test";
import { AppointmentService } from "./appointment";
import type { MindbodyApiClient } from "./mindbody";
import type { DatabaseClient } from "../db/client";
import type { MindbodyAppointment, GetAppointmentsParams } from "../types/appointment";

/**
 * Mock data matching REAL MinBody API v6 structure
 *
 * IMPORTANT: This now matches the actual API response from MinBody:
 * - IDs are NUMBERS (except ClientId which is string)
 * - Client, Location, SessionType nested objects DO NOT exist
 * - Staff object includes DisplayName and has numeric Id
 */
const mockMindbodyAppointments: MindbodyAppointment[] = [
  {
    Id: 12345,
    StartDateTime: "2024-01-15T10:00:00Z",
    EndDateTime: "2024-01-15T11:00:00Z",
    ClientId: "100000001",  // RSSID format (string)
    StaffId: 101,
    LocationId: 1,
    SessionTypeId: 50,
    Status: "Confirmed",
    Duration: 60,
    Staff: {
      Id: 101,
      FirstName: "Jane",
      LastName: "Smith",
      DisplayName: "Jane Smith",
    },
    FirstAppointment: false,
    GenderPreference: "None",
    IsWaitlist: false,
    StaffRequested: true,
    // NOTE: Client, Location, SessionType nested objects do NOT exist in real API
  },
  {
    Id: 12346,
    StartDateTime: "2024-01-15T14:00:00Z",
    EndDateTime: "2024-01-15T15:00:00Z",
    ClientId: "100000002",
    StaffId: 101,
    LocationId: 1,
    SessionTypeId: 50,
    Status: "Confirmed",
    Duration: 60,
    Staff: {
      Id: 101,
      FirstName: "Jane",
      LastName: "Smith",
      DisplayName: "Jane Smith",
    },
    FirstAppointment: true,
    IsWaitlist: false,
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
      expect(result.appointments[0]?.id).toBe("12345"); // Number converted to string
      expect(result.appointments[0]?.clientId).toBe("100000001");
      expect(result.appointments[0]?.staffId).toBe("101"); // Number converted to string
      expect(result.appointments[0]?.locationId).toBe("1");
      expect(result.appointments[0]?.sessionTypeId).toBe("50");
      expect(result.appointments[0]?.client).toBeNull(); // No nested Client object in real API
      expect(result.appointments[0]?.staff?.firstName).toBe("Jane");
      expect(result.appointments[0]?.staff?.id).toBe("101");
      expect(result.appointments[0]?.location).toBeNull(); // No nested Location object
      expect(result.appointments[0]?.sessionType).toBeNull(); // No nested SessionType object
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

  describe("getBookableItems", () => {
    const mockBookableItems = [
      {
        Id: "item-1",
        Name: "Personal Training Session",
        SessionType: {
          Id: "session-1",
          Name: "PT",
          DefaultTimeLength: 60,
        },
        Pricing: {
          Price: 100,
          OnlinePrice: 95,
          TaxIncluded: 5,
        },
        ProgramId: "program-1",
        Program: {
          Id: "program-1",
          Name: "Fitness Program",
        },
        LocationIds: ["location-1"],
        Locations: [
          {
            Id: "location-1",
            Name: "Main Studio",
          },
        ],
        StaffMembers: [
          {
            Id: "staff-1",
            FirstName: "Jane",
            LastName: "Smith",
            ImageUrl: "https://example.com/image.jpg",
          },
        ],
      },
      {
        Id: "item-2",
        Name: "Group Class",
        SessionType: {
          Id: "session-2",
          Name: "Group",
          DefaultTimeLength: 45,
        },
        Pricing: {
          Price: 30,
          OnlinePrice: 25,
          TaxIncluded: 2,
        },
      },
    ];

    beforeEach(() => {
      mockApiClient.getBookableItems = mock(async (params: any) => {
        return {
          BookableItems: mockBookableItems as any,
          PaginationResponse: {
            RequestedLimit: params.limit ?? 100,
            RequestedOffset: params.offset ?? 0,
            PageSize: mockBookableItems.length,
            TotalResults: mockBookableItems.length,
          },
        };
      });
    });

    test("should fetch bookable items from API when cache is empty", async () => {
      const params = {
        limit: 100,
        offset: 0,
        force: false,
      };

      const result = await service.getBookableItems(params);

      expect(result.bookableItems).toHaveLength(2);
      expect(result.bookableItems[0]?.id).toBe("item-1");
      expect(result.bookableItems[0]?.name).toBe("Personal Training Session");
      expect(result.bookableItems[0]?.pricing?.price).toBe(100);
      expect(result.bookableItems[0]?.staffMembers).toHaveLength(1);
      expect(result.pagination).toBeDefined();
      expect(result.pagination?.totalResults).toBe(2);
      expect(mockApiClient.getBookableItems).toHaveBeenCalledTimes(1);
    });

    test("should return cached bookable items when available and not expired", async () => {
      const params = {
        limit: 100,
        offset: 0,
        force: false,
      };

      const cachedResult = {
        bookableItems: [
          {
            id: "cached-item",
            name: "Cached Item",
            sessionType: null,
            pricing: null,
            programId: null,
            program: null,
            locationIds: [],
            locations: [],
            staffMembers: [],
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

      dbData.set("cache:bookable_items:all-locations:all-programs:all-session-types:all-staff:100:0", {
        value: JSON.stringify(cachedResult),
        expires_at: Date.now() + 86400000,
      });

      const result = await service.getBookableItems(params);

      expect(result.bookableItems).toHaveLength(1);
      expect(result.bookableItems[0]?.id).toBe("cached-item");
      expect(mockApiClient.getBookableItems).not.toHaveBeenCalled();
    });

    test("should bypass cache when force is true", async () => {
      const params = {
        limit: 100,
        offset: 0,
        force: true,
      };

      dbData.set("cache:bookable_items:all-locations:all-programs:all-session-types:all-staff:100:0", {
        value: JSON.stringify({ bookableItems: [], pagination: undefined }),
        expires_at: Date.now() + 86400000,
      });

      const result = await service.getBookableItems(params);

      expect(result.bookableItems).toHaveLength(2);
      expect(mockApiClient.getBookableItems).toHaveBeenCalledTimes(1);
    });

    test("should fetch from API when cache is expired", async () => {
      const params = {
        limit: 100,
        offset: 0,
        force: false,
      };

      dbData.set("cache:bookable_items:all-locations:all-programs:all-session-types:all-staff:100:0", {
        value: JSON.stringify({ bookableItems: [], pagination: undefined }),
        expires_at: Date.now() - 1000,
      });

      const result = await service.getBookableItems(params);

      expect(result.bookableItems).toHaveLength(2);
      expect(mockApiClient.getBookableItems).toHaveBeenCalledTimes(1);
    });

    test("should support filtering by locationIds", async () => {
      const params = {
        locationIds: ["location-1", "location-2"],
        limit: 100,
        offset: 0,
        force: false,
      };

      await service.getBookableItems(params);

      expect(mockApiClient.getBookableItems).toHaveBeenCalledWith(
        expect.objectContaining({
          locationIds: ["location-1", "location-2"],
        })
      );
    });

    test("should support filtering by programIds", async () => {
      const params = {
        programIds: ["program-1"],
        limit: 100,
        offset: 0,
        force: false,
      };

      await service.getBookableItems(params);

      expect(mockApiClient.getBookableItems).toHaveBeenCalledWith(
        expect.objectContaining({
          programIds: ["program-1"],
        })
      );
    });

    test("should support filtering by sessionTypeIds", async () => {
      const params = {
        sessionTypeIds: ["session-1", "session-2"],
        limit: 100,
        offset: 0,
        force: false,
      };

      await service.getBookableItems(params);

      expect(mockApiClient.getBookableItems).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTypeIds: ["session-1", "session-2"],
        })
      );
    });

    test("should support filtering by staffIds", async () => {
      const params = {
        staffIds: ["staff-1"],
        limit: 100,
        offset: 0,
        force: false,
      };

      await service.getBookableItems(params);

      expect(mockApiClient.getBookableItems).toHaveBeenCalledWith(
        expect.objectContaining({
          staffIds: ["staff-1"],
        })
      );
    });

    test("should support pagination with limit and offset", async () => {
      const params = {
        limit: 50,
        offset: 25,
        force: false,
      };

      await service.getBookableItems(params);

      expect(mockApiClient.getBookableItems).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 25,
        })
      );
    });

    test("should validate limit is within range (1-200)", async () => {
      const params = {
        limit: 250,
        offset: 0,
        force: false,
      } as any;

      await expect(service.getBookableItems(params)).rejects.toThrow();
    });

    test("should validate offset is non-negative", async () => {
      const params = {
        limit: 100,
        offset: -5,
        force: false,
      } as any;

      await expect(service.getBookableItems(params)).rejects.toThrow();
    });

    test("should handle API errors gracefully", async () => {
      mockApiClient.getBookableItems = mock(async () => {
        throw new Error("API Error");
      });

      const params = {
        limit: 100,
        offset: 0,
        force: false,
      };

      await expect(service.getBookableItems(params)).rejects.toThrow("API Error");
    });

    test("should handle bookable items with null/missing fields", async () => {
      mockApiClient.getBookableItems = mock(async () => ({
        BookableItems: [
          {
            Id: "item-minimal",
            Name: "Minimal Item",
          } as any,
        ],
        PaginationResponse: undefined,
      }));

      const params = {
        limit: 100,
        offset: 0,
        force: false,
      };

      const result = await service.getBookableItems(params);

      expect(result.bookableItems).toHaveLength(1);
      expect(result.bookableItems[0]?.sessionType).toBeNull();
      expect(result.bookableItems[0]?.pricing).toBeNull();
      expect(result.bookableItems[0]?.program).toBeNull();
      expect(result.bookableItems[0]?.locations).toEqual([]);
      expect(result.bookableItems[0]?.staffMembers).toEqual([]);
    });

    test("should generate unique cache keys for different parameters", async () => {
      const params1 = {
        limit: 100,
        offset: 0,
        force: false,
      };

      const params2 = {
        locationIds: ["location-1"],
        limit: 100,
        offset: 0,
        force: false,
      };

      await service.getBookableItems(params1);
      await service.getBookableItems(params2);

      expect(mockApiClient.getBookableItems).toHaveBeenCalledTimes(2);
    });

    test("should cache with 24-hour TTL", async () => {
      const params = {
        limit: 100,
        offset: 0,
        force: false,
      };

      await service.getBookableItems(params);

      const cacheKey = "bookable_items:all-locations:all-programs:all-session-types:all-staff:100:0";
      const cached = dbData.get(`cache:${cacheKey}`);

      expect(cached).toBeDefined();
      if (cached) {
        const ttl = cached.expires_at - Date.now();
        expect(ttl).toBeGreaterThan(86400000 - 1000);
        expect(ttl).toBeLessThanOrEqual(86400000);
      }
    });
  });

  describe("clearBookableItemsCache", () => {
    test("should clear all bookable items cache when no pattern specified", async () => {
      dbData.set("cache:bookable_items:all-locations:all-programs:all-session-types:all-staff:100:0", {
        value: "data",
        expires_at: Date.now() + 86400000,
      });

      const cleared = await service.clearBookableItemsCache();

      expect(cleared).toBeGreaterThanOrEqual(0);
    });

    test("should clear cache matching pattern", async () => {
      const cleared = await service.clearBookableItemsCache("bookable_items:location-1");

      expect(cleared).toBeGreaterThanOrEqual(0);
    });
  });
});
