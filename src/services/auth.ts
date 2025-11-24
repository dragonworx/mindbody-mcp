import type { Config } from "../config.js";
import { MINDBODY_API_BASE } from "../config.js";

interface UserTokenResponse {
  AccessToken: string;
  TokenType: string;
  ExpiresIn: number;
  RefreshToken?: string;
}

/**
 * Authentication service for managing Mindbody API tokens
 * Handles automatic token rotation and caching
 */
export class AuthService {
  private userToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private fetchFn: typeof fetch;

  constructor(private config: Config, fetchFn?: typeof fetch) {
    this.fetchFn = fetchFn || fetch;
  }

  /**
   * Get a valid user token, refreshing if necessary
   */
  async getUserToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.userToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.userToken;
    }

    // Issue a new token
    await this.issueNewToken();

    if (!this.userToken) {
      throw new Error("Failed to obtain user token");
    }

    return this.userToken;
  }

  /**
   * Issue a new user token from Mindbody API
   */
  private async issueNewToken(): Promise<void> {
    try {
      const response = await this.fetchFn(`${MINDBODY_API_BASE}/usertoken/issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": this.config.MBO_API_KEY,
          "SiteId": this.config.MBO_SITE_ID,
        },
        body: JSON.stringify({
          Username: this.config.MBO_STAFF_USERNAME,
          Password: this.config.MBO_STAFF_PASSWORD,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token issue failed: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as UserTokenResponse;

      this.userToken = data.AccessToken;

      // Set expiry to 80% of the actual expiry time for safety
      const expirySeconds = data.ExpiresIn * 0.8;
      this.tokenExpiry = new Date(Date.now() + expirySeconds * 1000);

      if (this.config.LOG_LEVEL === "debug") {
        console.error(`[Auth] New token issued, expires at ${this.tokenExpiry.toISOString()}`);
      }
    } catch (error) {
      console.error("[Auth] Failed to issue token:", error);
      throw error;
    }
  }

  /**
   * Invalidate the current token (forces refresh on next request)
   */
  invalidateToken(): void {
    this.userToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Check if we have a valid token cached
   */
  hasValidToken(): boolean {
    return Boolean(this.userToken && this.tokenExpiry && this.tokenExpiry > new Date());
  }
}
