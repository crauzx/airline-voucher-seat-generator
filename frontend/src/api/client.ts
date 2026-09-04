import { ApiErrorShape } from '../types/api';

export class ApiRequestError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

export async function postJson<TResponse>(url: string, body: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorShape = data as ApiErrorShape | null;
    throw new ApiRequestError(
      response.status,
      errorShape?.error?.code ?? 'UNKNOWN_ERROR',
      errorShape?.error?.message ?? 'Something went wrong. Please try again.'
    );
  }

  return data as TResponse;
}
