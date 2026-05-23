export abstract class ReservationDomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InsufficientInventoryError extends ReservationDomainError {
  readonly code = "INSUFFICIENT_INVENTORY";

  constructor(
    message = "Insufficient inventory to complete the reservation",
    readonly availableQuantity?: number,
  ) {
    super(message);
  }
}

export class ReservationExpiredError extends ReservationDomainError {
  readonly code = "RESERVATION_EXPIRED";

  constructor(message = "Reservation has expired") {
    super(message);
  }
}

export class ReservationAlreadyConfirmedError extends ReservationDomainError {
  readonly code = "RESERVATION_ALREADY_CONFIRMED";

  constructor(message = "Reservation is already confirmed") {
    super(message);
  }
}

export class ReservationAlreadyReleasedError extends ReservationDomainError {
  readonly code = "RESERVATION_ALREADY_RELEASED";

  constructor(message = "Reservation is already released") {
    super(message);
  }
}

export class InvalidReservationStateError extends ReservationDomainError {
  readonly code = "INVALID_RESERVATION_STATE";

  constructor(message: string) {
    super(message);
  }
}

export class ReservationNotFoundError extends ReservationDomainError {
  readonly code = "RESERVATION_NOT_FOUND";

  constructor(message = "Reservation not found") {
    super(message);
  }
}

export class ProductNotFoundError extends ReservationDomainError {
  readonly code = "PRODUCT_NOT_FOUND";

  constructor(message = "Product not found") {
    super(message);
  }
}

export class WarehouseNotFoundError extends ReservationDomainError {
  readonly code = "WAREHOUSE_NOT_FOUND";

  constructor(message = "Warehouse not found") {
    super(message);
  }
}

export class InventoryNotFoundError extends ReservationDomainError {
  readonly code = "INVENTORY_NOT_FOUND";

  constructor(
    message = "No inventory record exists for this product at the warehouse",
  ) {
    super(message);
  }
}

export function isReservationDomainError(
  error: unknown,
): error is ReservationDomainError {
  return error instanceof ReservationDomainError;
}
