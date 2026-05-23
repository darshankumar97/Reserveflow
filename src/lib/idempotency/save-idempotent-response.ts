import { writeIdempotentRecord } from "@/lib/idempotency/store";
import type { IdempotentRecord } from "@/lib/idempotency/types";

export async function saveIdempotentResponse(
  redisKey: string,
  input: {
    requestHash: string;
    httpStatus: number;
    body: string;
  },
): Promise<void> {
  const record: IdempotentRecord = {
    requestHash: input.requestHash,
    status: "complete",
    httpStatus: input.httpStatus,
    body: input.body,
    createdAt: new Date().toISOString(),
  };

  await writeIdempotentRecord(redisKey, record);
}

export async function saveIdempotentProcessing(
  redisKey: string,
  requestHash: string,
): Promise<void> {
  const record: IdempotentRecord = {
    requestHash,
    status: "processing",
    httpStatus: 0,
    body: "",
    createdAt: new Date().toISOString(),
  };

  await writeIdempotentRecord(redisKey, record);
}
