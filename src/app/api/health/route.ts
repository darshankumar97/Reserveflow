import { isIdempotencyRedisConfigured } from "@/lib/env";
import { getServerEnv } from "@/lib/env";
import { db } from "@/lib/db";
import { isRedisConfigured } from "@/lib/redis/client";
import { withApiHandler } from "@/lib/api/route-handler";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async () => {
  getServerEnv();
  await db.$queryRaw`SELECT 1`;

  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    dependencies: {
      database: "up",
      redis: isRedisConfigured() ? "up" : "not_configured",
      idempotencyStore: isIdempotencyRedisConfigured()
        ? "redis"
        : "in_memory_fallback",
    },
  };
});
