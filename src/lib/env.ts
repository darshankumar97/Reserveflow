import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
  IDEMPOTENCY_TTL_SECONDS: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const shouldSkip =
    process.env.SKIP_ENV_VALIDATION === "true" ||
    process.env.CI === "true";

  if (shouldSkip) {
    cachedEnv = {
      NODE_ENV:
        (process.env.NODE_ENV as ServerEnv["NODE_ENV"] | undefined) ??
        "development",
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      DIRECT_URL: process.env.DIRECT_URL ?? "",
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      IDEMPOTENCY_TTL_SECONDS: process.env.IDEMPOTENCY_TTL_SECONDS,
    };
    return cachedEnv;
  }

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function isIdempotencyRedisConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
}
