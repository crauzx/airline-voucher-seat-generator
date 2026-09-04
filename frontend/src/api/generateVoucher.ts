import { postJson } from './client';
import { GenerateRequest, GenerateResponse } from '../types/api';

export function generateVoucher(request: GenerateRequest): Promise<GenerateResponse> {
  return postJson<GenerateResponse>('/api/generate', request);
}
