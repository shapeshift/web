// Utility selectors, which are only used for params selecting and do NOT select from the store

import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import createCachedSelector from 're-reselect'

import type { ReduxState } from './reducer'
import type { LpId, StakingId, UserStakingId } from './slices/opportunitiesSlice/types'
import type { PubKey } from './slices/validatorDataSlice/validatorDataSlice'

/**
 * List of all the params filter consumed with selectParamFromFilter
 *
 * note - this **must** stay as Partial, it's the selectors consumers responsibility to check
 * for existence of these. it's neither ergonomic nor feasible for the view layer consumers
 * to guard, or even necessarily have, the required params before calling selectors.
 *
 * wen conditional hooks?
 */
type ParamFilter = Partial<{
  accountAddress: string
  contractAddress: string
  assetId: AssetId
  accountId: AccountId
  validatorAddress: PubKey
  accountNumber: number
  chainId: ChainId
  userStakingId: UserStakingId
  stakingId: StakingId
  lpId: LpId
}>

type ParamFilterKey = keyof ParamFilter

export const selectParamFromFilter = <T extends ParamFilterKey>(param: T) =>
  createCachedSelector(
    (_state: ReduxState, filter: Pick<ParamFilter, T> | null): ParamFilter[T] | undefined =>
      filter?.[param],
    param => param,
  )(
    (_state: ReduxState, filter: Pick<ParamFilter, T> | null) =>
      `${param}-${filter?.[param]}` ?? param,
  )

export const selectAccountAddressParamFromFilter = selectParamFromFilter('accountAddress')
export const selectAccountIdParamFromFilter = selectParamFromFilter('accountId')
export const selectAccountNumberParamFromFilter = selectParamFromFilter('accountNumber')
export const selectAssetIdParamFromFilter = selectParamFromFilter('assetId')
export const selectChainIdParamFromFilter = selectParamFromFilter('chainId')
export const selectValidatorAddressParamFromFilter = selectParamFromFilter('validatorAddress')
export const selectUserStakingIdParamFromFilter = selectParamFromFilter('userStakingId')
export const selectStakingIdParamFromFilter = selectParamFromFilter('stakingId')
export const selectLpIdParamFromFilter = selectParamFromFilter('lpId')
