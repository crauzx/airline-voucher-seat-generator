import { postJson } from './client';
import { CheckRequest, CheckResponse } from '../types/api';

export function checkVoucher(request: CheckRequest): Promise<CheckResponse> {
  return postJson<CheckResponse>('/api/check', request);
}
