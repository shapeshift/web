import { ApiError } from '../api/client'

// Rate limits and timeouts clear on their own; any other client error repeats until the request changes
export const isPermanentApiError = (error: unknown): boolean =>
  error instanceof ApiError &&
  error.status >= 400 &&
  error.status < 500 &&
  error.status !== 408 &&
  error.status !== 429
