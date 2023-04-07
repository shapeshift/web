import cloneDeep from 'lodash.clonedeep'
import snakeCase from 'lodash.snakecase'

import { ErrorWithCause } from './ErrorWithCause'

export class ErrorWithDetails<
  T extends
    | { cause?: unknown; details?: Record<string, unknown>; code?: string }
    | undefined = undefined,
> extends ErrorWithCause<T> {
  public details: (T extends { details: infer R } ? R : undefined) | undefined
  /**
   * A string representing the error state
   *
   * This allows different language translations to be used for a given error
   * rather than relying on the text the programmer put in the error message
   */
  #code?: string

  constructor(message?: string, options?: T) {
    super(message, options)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (options?.details) this.details = cloneDeep<any>(options.details)
    this.code = options?.code
  }

  get code(): string | undefined {
    return this.#code
  }

  /**
   * Normalize error codes to uppercase + snake_case for consistency
   */
  set code(value: string | undefined) {
    this.#code = snakeCase(value || 'ERR_UNKNOWN').toUpperCase()
  }
}
