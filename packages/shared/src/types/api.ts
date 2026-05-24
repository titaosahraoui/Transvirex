export interface ApiResponse<T = undefined> {
  status: 'success' | 'failure' | 'pending';
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}

export function createSuccess<T>(data: T): ApiResponse<T> {
  return { status: 'success', data, timestamp: new Date().toISOString() };
}

export function createError(code: string, message: string): ApiResponse {
  return { status: 'failure', error: { code, message }, timestamp: new Date().toISOString() };
}

export function createPending<T>(data?: T): ApiResponse<T> {
  return { status: 'pending', data, timestamp: new Date().toISOString() };
}
