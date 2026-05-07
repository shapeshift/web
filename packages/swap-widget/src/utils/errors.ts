export const getErrorMessage = (error: unknown, fallback = 'Unknown error'): string => {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const e = error as { shortMessage?: unknown; message?: unknown }
    if (typeof e.shortMessage === 'string' && e.shortMessage) return e.shortMessage
    if (typeof e.message === 'string' && e.message) return e.message
  }
  return fallback
}
