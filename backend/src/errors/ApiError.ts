export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'VOUCHER_EXISTS'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  statusCode: number;
  code: ApiErrorCode;

  constructor(statusCode: number, code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }

  static validation(message: string): ApiError {
    return new ApiError(400, 'VALIDATION_ERROR', message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, 'VOUCHER_EXISTS', message);
  }

  static internal(message = 'An unexpected error occurred'): ApiError {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }

  static rateLimited(message = 'Too many requests. Please try again shortly.'): ApiError {
    return new ApiError(429, 'RATE_LIMITED', message);
  }
}
