import { z } from "zod";

const envSchema = z.object({
  // Mindbody Developer Credentials
  MBO_API_KEY: z.string().min(1, "Mindbody API key is required"),
  MBO_SITE_ID: z.string().min(1, "Mindbody Site ID is required"),
  MBO_STAFF_USERNAME: z.string().min(1, "Staff username is required"),
  MBO_STAFF_PASSWORD: z.string().min(1, "Staff password is required"),

  // Server Config
  MCP_SERVER_NAME: z.string().default("mindbody-migrator"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DATA_DIR: z.string().default("./data"),

  // Safety Limits
  DAILY_API_LIMIT_OVERRIDE: z.coerce.number().default(950),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  try {
    const config = envSchema.parse(process.env);
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
      throw new Error(`Environment validation failed:\n${issues}`);
    }
    throw error;
  }
}

export const MINDBODY_API_BASE = "https://api.mindbodyonline.com/public/v6";
