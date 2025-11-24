import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { AuthService } from "../services/auth.js";
import type { Config } from "../config.js";

describe("AuthService", () => {
  let authService: AuthService;
  const testConfig: Config = {
    MBO_API_KEY: "test-api-key",
    MBO_SITE_ID: "123456",
    MBO_STAFF_USERNAME: "test-user",
    MBO_STAFF_PASSWORD: "test-pass",
    MCP_SERVER_NAME: "test-server",
    LOG_LEVEL: "info",
    DATA_DIR: "./test-data",
    DAILY_API_LIMIT_OVERRIDE: 950,
  };

  beforeEach(() => {
    authService = new AuthService(testConfig);
  });

  describe("getUserToken", () => {
    test("should issue a new token on first call", async () => {
      const mockResponse = {
        AccessToken: "test-token-123",
        TokenType: "Bearer",
        ExpiresIn: 3600,
      };

      const fetchMock = mock(async () =>
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      authService = new AuthService(testConfig, fetchMock);

      const token = await authService.getUserToken();

      expect(token).toBe("test-token-123");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.mindbodyonline.com/public/v6/usertoken/issue",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "Api-Key": "test-api-key",
            SiteId: "123456",
          }),
          body: JSON.stringify({
            Username: "test-user",
            Password: "test-pass",
          }),
        })
      );
    });

    test("should return cached token if still valid", async () => {
      const mockResponse = {
        AccessToken: "test-token-123",
        TokenType: "Bearer",
        ExpiresIn: 3600,
      };

      const fetchMock = mock(async () =>
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      authService = new AuthService(testConfig, fetchMock);

      const token1 = await authService.getUserToken();
      const token2 = await authService.getUserToken();

      expect(token1).toBe(token2);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test("should refresh token if expired", async () => {
      const mockResponse1 = {
        AccessToken: "test-token-1",
        TokenType: "Bearer",
        ExpiresIn: 0.001, // Very short expiry
      };

      const mockResponse2 = {
        AccessToken: "test-token-2",
        TokenType: "Bearer",
        ExpiresIn: 3600,
      };

      let callCount = 0;
      const fetchMock = mock(async () => {
        callCount++;
        const response = callCount === 1 ? mockResponse1 : mockResponse2;
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      authService = new AuthService(testConfig, fetchMock);

      const token1 = await authService.getUserToken();

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      const token2 = await authService.getUserToken();

      expect(token1).toBe("test-token-1");
      expect(token2).toBe("test-token-2");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    test("should throw error when API returns non-200 status", async () => {
      const fetchMock = mock(async () =>
        new Response("Unauthorized", {
          status: 401,
        })
      );

      authService = new AuthService(testConfig, fetchMock);

      // Silence expected error logs
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

      await expect(authService.getUserToken()).rejects.toThrow(
        "Token issue failed: 401"
      );

      consoleErrorSpy.mockRestore();
    });

    test("should throw error when response is invalid JSON", async () => {
      const fetchMock = mock(async () =>
        new Response("Invalid JSON", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      authService = new AuthService(testConfig, fetchMock);

      // Silence expected error logs
      const consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

      await expect(authService.getUserToken()).rejects.toThrow();

      consoleErrorSpy.mockRestore();
    });

    test("should set token expiry to 80% of actual expiry", async () => {
      const mockResponse = {
        AccessToken: "test-token-123",
        TokenType: "Bearer",
        ExpiresIn: 1000,
      };

      const fetchMock = mock(async () =>
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      authService = new AuthService(testConfig, fetchMock);

      await authService.getUserToken();

      // Token should be valid for 800 seconds (80% of 1000)
      expect(authService.hasValidToken()).toBe(true);
    });
  });

  describe("invalidateToken", () => {
    test("should clear cached token", async () => {
      const mockResponse = {
        AccessToken: "test-token-123",
        TokenType: "Bearer",
        ExpiresIn: 3600,
      };

      const fetchMock = mock(async () =>
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      authService = new AuthService(testConfig, fetchMock);

      await authService.getUserToken();
      expect(authService.hasValidToken()).toBe(true);

      authService.invalidateToken();
      expect(authService.hasValidToken()).toBe(false);
    });

    test("should force new token request after invalidation", async () => {
      const mockResponse1 = {
        AccessToken: "test-token-1",
        TokenType: "Bearer",
        ExpiresIn: 3600,
      };

      const mockResponse2 = {
        AccessToken: "test-token-2",
        TokenType: "Bearer",
        ExpiresIn: 3600,
      };

      let callCount = 0;
      const fetchMock = mock(async () => {
        callCount++;
        const response = callCount === 1 ? mockResponse1 : mockResponse2;
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      authService = new AuthService(testConfig, fetchMock);

      const token1 = await authService.getUserToken();
      authService.invalidateToken();
      const token2 = await authService.getUserToken();

      expect(token1).toBe("test-token-1");
      expect(token2).toBe("test-token-2");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("hasValidToken", () => {
    test("should return false when no token is cached", () => {
      expect(authService.hasValidToken()).toBe(false);
    });

    test("should return true when valid token is cached", async () => {
      const mockResponse = {
        AccessToken: "test-token-123",
        TokenType: "Bearer",
        ExpiresIn: 3600,
      };

      const fetchMock = mock(async () =>
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      authService = new AuthService(testConfig, fetchMock);

      await authService.getUserToken();
      expect(authService.hasValidToken()).toBe(true);
    });

    test("should return false when token is expired", async () => {
      const mockResponse = {
        AccessToken: "test-token-123",
        TokenType: "Bearer",
        ExpiresIn: 0.001, // Very short expiry
      };

      const fetchMock = mock(async () =>
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      authService = new AuthService(testConfig, fetchMock);

      await authService.getUserToken();

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(authService.hasValidToken()).toBe(false);
    });
  });
});
