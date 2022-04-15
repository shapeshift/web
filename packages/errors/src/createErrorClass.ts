import ErrorWithDetails from './ErrorWithDetails'

export function createErrorClass<
  T extends Record<string, unknown>,
  U extends { cause?: unknown; details?: T } = { cause?: unknown; details?: T }
>(name: `${string}Error`) {
  const cls = {
    [name]: class<V extends U> extends ErrorWithDetails<V> {
      constructor(message?: string, options?: V) {
        super(message, options)
        this.name = name
      }
    }
  }

  return cls[name]
}
