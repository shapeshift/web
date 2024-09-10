import { isNull, isUndefined } from 'lodash'

export * from './makeAsset/makeAsset'
export * from './assertUnreachable'
export * from './sha256'
export * from './chainIdToFeeAsset'
export * from './chainIdToFeeAssetId'
export * from './utxo'
export * from './bignumber/bignumber'
export * from './basisPoints'
export * from './baseUnits/baseUnits'
export * from './promises'
export * from './treasury'
export * from './timeout'
export * from './createThrottle'

export const isSome = <T>(option: T | null | undefined): option is T =>
  !isUndefined(option) && !isNull(option)
