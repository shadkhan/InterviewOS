export class NotFoundError extends Error {
  constructor(message = "Resource not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends Error {
  constructor(message = "Rate limit exceeded.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export class PersistenceError extends Error {
  constructor(message = "Unable to complete the request.") {
    super(message);
    this.name = "PersistenceError";
  }
}
