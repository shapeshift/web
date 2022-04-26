import { FormattedError, FormattedObject } from './logger.type'

const objectProto = Object.getPrototypeOf(Object())
function isObject(value: unknown): value is Record<string, unknown> {
  return (
    value != null &&
    typeof value === 'object' &&
    (Object.getPrototypeOf(value) == null || Object.getPrototypeOf(value) === objectProto)
  )
}

function isError(value: unknown): value is Error {
  if (value instanceof Error) return true
  if (typeof value !== 'object' || value == null) return false
  const o = Object(value)
  return (
    typeof o.message === 'string' &&
    typeof o.constructor.name === 'string' &&
    typeof o.stack === 'string'
  )
}

/**
 * Support errors with additional properties
 * @shapeshiftoss/errors implement these additional properties
 */
function isErrorWithDetails(value: unknown): value is Error & {
  code?: string
  details?: Record<string, unknown>
  cause: unknown
} {
  return isError(value) && 'cause' in value
}

// this function accepts anything (string, object, array, or error) and
// returns an object that datadog knows how to ingest
export default function format(x: unknown): FormattedObject | undefined {
  // plain strings can only be included if they have a key in the result object
  if (typeof x === 'string') return { message: x }
  // Create a shallow copy of objects
  if (isObject(x)) return { ...x }
  // Specific formatting for errors
  if (isError(x)) {
    const error: FormattedError = {
      message: x.message,
      // Only keep the first 6 lines of the stack trace
      stack: x.stack?.split('\n').slice(0, 6).join('\n'),
      kind: x.constructor.name
    }
    if (isErrorWithDetails(x)) {
      error.code = x.code
      error.details = format(x.details)
      error.cause = format(x.cause)
    }

    return { error }
  }
  if (Array.isArray(x)) {
    throw new Error('Arrays cannot be formatted for logging')
  }
  return undefined
}
