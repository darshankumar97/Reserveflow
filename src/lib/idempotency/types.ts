export const IDEMPOTENCY_KEY_HEADER = "idempotency-key";

export const DEFAULT_IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24;

export type IdempotentRecord = {
  requestHash: string;
  status: "processing" | "complete";
  httpStatus: number;
  body: string;
  createdAt: string;
};

export type IdempotentExecutionResult<T> = {
  data: T;
  httpStatus: number;
  replayed: boolean;
};
