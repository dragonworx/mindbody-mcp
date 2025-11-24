import type { DatabaseClient } from "../db/client.js";
import type { Config } from "../config.js";

export class RateLimitGuard {
  constructor(
    private db: DatabaseClient,
    private config: Config
  ) {}

  private getTodayDate(): string {
    const now = new Date();
    return now.toISOString().split("T")[0] as string;
  }

  async checkLimit(force = false): Promise<void> {
    const today = this.getTodayDate();
    const currentUsage = this.db.getApiUsage(today);

    if (currentUsage >= this.config.DAILY_API_LIMIT_OVERRIDE && !force) {
      throw new Error(
        `Daily API limit reached (${currentUsage}/${this.config.DAILY_API_LIMIT_OVERRIDE}). ` +
        `Resets at midnight UTC. Use force flag to override.`
      );
    }

    if (this.config.LOG_LEVEL === "debug") {
      console.error(`[RateLimit] API calls today: ${currentUsage}/${this.config.DAILY_API_LIMIT_OVERRIDE}`);
    }
  }

  recordCall(): void {
    const today = this.getTodayDate();
    this.db.incrementApiUsage(today);
  }

  getUsageStats(): {
    callsMade: number;
    limit: number;
    callsRemaining: number;
    resetTime: string;
  } {
    const today = this.getTodayDate();
    const callsMade = this.db.getApiUsage(today);
    const limit = this.config.DAILY_API_LIMIT_OVERRIDE;
    const callsRemaining = Math.max(0, limit - callsMade);

    // Calculate next midnight UTC
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    const resetTime = tomorrow.toISOString();

    return {
      callsMade,
      limit,
      callsRemaining,
      resetTime,
    };
  }

  isApproachingLimit(): boolean {
    const today = this.getTodayDate();
    const currentUsage = this.db.getApiUsage(today);
    return currentUsage >= this.config.DAILY_API_LIMIT_OVERRIDE * 0.8;
  }
}
