import type { Result } from '@sniptt/monads'

export const isFulfilled = <T>(
  promise: PromiseSettledResult<T>,
): promise is PromiseFulfilledResult<T> => promise.status === 'fulfilled'

export const isRejected = <T>(promise: PromiseSettledResult<T>): promise is PromiseRejectedResult =>
  promise.status === 'rejected'

export const isResolvedErr = <U, V, T extends Result<U, V>>(
  promise: PromiseSettledResult<T>,
): promise is PromiseRejectedResult => 'value' in promise && promise.value.isErr()
