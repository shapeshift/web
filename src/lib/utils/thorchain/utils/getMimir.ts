import type { ThorchainMimir } from '../types'

export const getMimir = <T extends keyof ThorchainMimir>(
  mimir: ThorchainMimir,
  key: T,
): ThorchainMimir[T] => {
  return mimir[key]
}
