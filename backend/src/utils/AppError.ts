/**
 * Custom application error class for structured error handling.
 * Extends the native Error class with HTTP status code, error code, and optional details.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture stack trace (excludes constructor from trace)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Serialize the error to a JSON-friendly format for API responses.
   */
  toJSON(): Record<string, unknown> {
    return {
      statusCode: this.statusCode,
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}
