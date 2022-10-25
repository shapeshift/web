// Utility selectors, which are only used for params selecting and do NOT select from the store

import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import createCachedSelector from 're-reselect'

import type { ReduxState } from './reducer'
import type { UserStakingId } from './slices/opportunitiesSlice/opportunitiesSlice'
import type { PubKey } from './slices/validatorDataSlice/validatorDataSlice'

// List of all the params filter consumed with selectParamFromFilter
type ParamFilter = {
  accountAddress: string
  contractAddress: string
  assetId: AssetId
  accountId: AccountId
  accountNumber: number
  chainId: ChainId
  validatorAddress: PubKey
  userStakingId: UserStakingId
}

// List of all the params filter consumed with selectParamFromFilterOptional
type OptionalParamFilter = {
  accountAddress?: string
  contractAddress?: string
  assetId?: AssetId
  accountId?: AccountId
  validatorAddress?: PubKey
}

type ParamFilterKey = keyof ParamFilter
type OptionalParamFilterKey = keyof OptionalParamFilter

export const selectParamFromFilter = <T extends ParamFilterKey>(param: T) =>
  createCachedSelector(
    (_state: ReduxState, filter: Pick<ParamFilter, T>): ParamFilter[T] | '' =>
      filter?.[param] ?? '',
    param => param,
  )((_state: ReduxState, filter: Pick<ParamFilter, T>) => filter?.[param] ?? param)
export const selectParamFromFilterOptional = <T extends OptionalParamFilterKey>(param: T) =>
  createCachedSelector(
    (_state: ReduxState, filter: Pick<OptionalParamFilter, T>): OptionalParamFilter[T] | '' =>
      filter?.[param] ?? '',
    param => param,
  )(
    (_state: ReduxState, filter: Pick<OptionalParamFilter, T>) =>
      `${param}-${filter?.[param]}` ?? param,
  )

export const selectAccountAddressParamFromFilter = selectParamFromFilter('accountAddress')
export const selectAccountIdParamFromFilter = selectParamFromFilter('accountId')
export const selectAccountNumberParamFromFilter = selectParamFromFilter('accountNumber')
export const selectAssetIdParamFromFilter = selectParamFromFilter('assetId')
export const selectChainIdParamFromFilter = selectParamFromFilter('chainId')
export const selectValidatorAddressParamFromFilter = selectParamFromFilter('validatorAddress')
export const selectUserStakingIdParamFromFilter = selectParamFromFilter('userStakingId')

export const selectAccountAddressParamFromFilterOptional =
  selectParamFromFilterOptional('accountAddress')
export const selectAccountIdParamFromFilterOptional = selectParamFromFilterOptional('accountId')
export const selectAssetIdParamFromFilterOptional = selectParamFromFilterOptional('assetId')
