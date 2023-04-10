import { ErrorWithDetails } from './ErrorWithDetails'

export function createErrorClass<
  T extends Record<string, unknown>,
  U extends { cause?: unknown; details?: T; code?: string } = {
    cause?: unknown
    details?: T
    code?: string
  },
>(name: `${string}Error`) {
  const cls = {
    [name]: class<V extends U> extends ErrorWithDetails<V> {
      constructor(message?: string, options?: V) {
        super(message, options)
        this.name = name
        this.code = options?.code || `ERR_${name.substring(0, name.indexOf('Error'))}`
      }
    },
  }

  return cls[name]
}
