export class IdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT";

  constructor(
    message = "Idempotency-Key was already used with a different request payload",
  ) {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}

export class IdempotencyInProgressError extends Error {
  readonly code = "IDEMPOTENCY_IN_PROGRESS";

  constructor(
    message = "A request with this Idempotency-Key is still being processed",
  ) {
    super(message);
    this.name = "IdempotencyInProgressError";
  }
}
