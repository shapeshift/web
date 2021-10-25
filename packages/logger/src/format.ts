import { FormattedObject } from './logger.type'

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

// this function accepts anything (string, object, array, or error) and
// returns an object that datadog knows how to ingest
export default function format(x: unknown): FormattedObject | undefined {
  if (typeof x === 'string') return { message: x }
  if (isObject(x)) return x
  if (isError(x))
    return {
      error: {
        message: x.message,
        stack: x.stack,
        kind: x.constructor.name
      }
    }
  if (Array.isArray(x)) {
    throw new Error('Arrays cannot be formatted for logging')
  }
  return undefined
}
