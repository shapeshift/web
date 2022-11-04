// Utility selectors, which are only used for params selecting and do NOT select from the store

import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import createCachedSelector from 're-reselect'

import type { ReduxState } from './reducer'
import type { LpId, StakingId, UserStakingId } from './slices/opportunitiesSlice/types'
import type { PubKey } from './slices/validatorDataSlice/validatorDataSlice'

// List of all the params filter consumed with selectParamFromFilterOptional
type OptionalParamFilter = {
  accountAddress?: string
  contractAddress?: string
  assetId?: AssetId
  accountId?: AccountId
  validatorAddress?: PubKey
  accountNumber?: number
  chainId?: ChainId
  userStakingId?: UserStakingId
  stakingId?: StakingId
  lpId?: LpId
}

type OptionalParamFilterKey = keyof OptionalParamFilter

export const selectParamFromFilterOptional = <T extends OptionalParamFilterKey>(param: T) =>
  createCachedSelector(
    (
      _state: ReduxState,
      filter: Pick<OptionalParamFilter, T>,
    ): OptionalParamFilter[T] | undefined => {
      const result = filter?.[param]
      if (!result) console.warn(`no result for param ${param}`)
      return result
    },
    param => param,
  )(
    (_state: ReduxState, filter: Pick<OptionalParamFilter, T>) =>
      `${param}-${filter?.[param]}` ?? param,
  )

export const selectParamFromFilter = selectParamFromFilterOptional

export const selectAccountAddressParamFromFilter = selectParamFromFilter('accountAddress')
export const selectAccountIdParamFromFilter = selectParamFromFilter('accountId')
export const selectAccountNumberParamFromFilter = selectParamFromFilter('accountNumber')
export const selectAssetIdParamFromFilter = selectParamFromFilter('assetId')
export const selectChainIdParamFromFilter = selectParamFromFilter('chainId')
export const selectValidatorAddressParamFromFilter = selectParamFromFilter('validatorAddress')
export const selectUserStakingIdParamFromFilter = selectParamFromFilter('userStakingId')
export const selectStakingIdParamFromFilter = selectParamFromFilter('stakingId')
export const selectLpIdParamFromFilter = selectParamFromFilter('lpId')

export const selectAccountAddressParamFromFilterOptional =
  selectParamFromFilterOptional('accountAddress')
export const selectAccountIdParamFromFilterOptional = selectParamFromFilterOptional('accountId')
export const selectAssetIdParamFromFilterOptional = selectParamFromFilterOptional('assetId')
