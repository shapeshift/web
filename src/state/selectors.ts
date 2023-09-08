// Utility selectors, which are only used for params selecting and do NOT select from the store

import type { QueryStatus } from '@reduxjs/toolkit/dist/query'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import createCachedSelector from 're-reselect'
import type { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'

import type { ReduxState } from './reducer'
import type {
  DefiProvider,
  DefiType,
  LpId,
  StakingId,
  UserStakingId,
  ValidatorId,
} from './slices/opportunitiesSlice/types'

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
  validatorId: ValidatorId
  accountNumber: number
  chainId: ChainId
  userStakingId: UserStakingId
  stakingId: StakingId
  lpId: LpId
  fiatRampAction: FiatRampAction
  defiProvider: DefiProvider
  defiType: DefiType
  queryStatus: QueryStatus
  endpointName: string
  includeEarnBalances: boolean
  includeRewardsBalances: boolean
  searchQuery: string
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

export const selectAccountIdParamFromFilter = selectParamFromFilter('accountId')
export const selectAccountNumberParamFromFilter = selectParamFromFilter('accountNumber')
export const selectAssetIdParamFromFilter = selectParamFromFilter('assetId')
export const selectChainIdParamFromFilter = selectParamFromFilter('chainId')
export const selectUserStakingIdParamFromFilter = selectParamFromFilter('userStakingId')
export const selectStakingIdParamFromFilter = selectParamFromFilter('stakingId')
export const selectLpIdParamFromFilter = selectParamFromFilter('lpId')
export const selectValidatorIdParamFromFilter = selectParamFromFilter('validatorId')
export const selectDefiProviderParamFromFilter = selectParamFromFilter('defiProvider')
export const selectDefiTypeParamFromFilter = selectParamFromFilter('defiType')
export const selectQueryStatusParamFromFilter = selectParamFromFilter('queryStatus')
export const selectEndpointNameParamFromFilter = selectParamFromFilter('endpointName')
export const selectIncludeEarnBalancesParamFromFilter = selectParamFromFilter('includeEarnBalances')
export const selectIncludeRewardsBalancesParamFromFilter =
  selectParamFromFilter('includeRewardsBalances')
export const selectSearchQueryFromFilter = selectParamFromFilter('searchQuery')
