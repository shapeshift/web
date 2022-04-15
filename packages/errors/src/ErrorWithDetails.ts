import cloneDeep from 'lodash.clonedeep'

import ErrorWithCause from './ErrorWithCause'

export default class ErrorWithDetails<
  T extends { cause?: unknown; details?: Record<string, unknown> } | undefined = undefined
> extends ErrorWithCause<T> {
  public details: T extends { details: infer R } ? R : undefined

  constructor(message?: string, options?: T) {
    super(message, options)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (options?.details) this.details = cloneDeep<any>(options.details)
  }
}
