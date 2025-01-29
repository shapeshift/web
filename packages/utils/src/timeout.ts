import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

export const timeout = <SuccessType, FallbackType>(
  promise: Promise<SuccessType>,
  timeoutMs: number,
  fallbackValue: FallbackType,
): Promise<SuccessType | FallbackType> => {
  return Promise.race([
    promise,
    new Promise<FallbackType>(resolve =>
      setTimeout(() => {
        resolve(fallbackValue)
      }, timeoutMs),
    ),
  ])
}

export const timeoutMonadic = <Left, Right>(
  promise: Promise<Result<Left, Right>>,
  timeoutMs: number,
  timeoutRight: Right,
): Promise<Result<Left, Right>> => {
  return Promise.race([
    promise,
    new Promise<Result<Left, Right>>(resolve =>
      setTimeout(() => {
        resolve(Err(timeoutRight) as Result<Left, Right>)
      }, timeoutMs),
    ),
  ])
}
