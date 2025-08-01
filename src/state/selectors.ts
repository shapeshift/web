// Utility selectors, which are only used for params selecting and do NOT select from the store

import type { QueryStatus } from '@reduxjs/toolkit/query'
import type { AccountId, AssetId, ChainId } from '@shapeshiftoss/caip'
import type { TxMetadata } from '@shapeshiftoss/chain-adapters'
import type { TradeQuote } from '@shapeshiftoss/swapper'
import type { HistoryTimeframe } from '@shapeshiftoss/types'
import type { common, TxStatus } from '@shapeshiftoss/unchained-client'
import createCachedSelector from 're-reselect'

import type { ReduxState } from './reducer'
import type {
  DefiProvider,
  DefiType,
  LpId,
  StakingId,
  UserStakingId,
  ValidatorId,
} from './slices/opportunitiesSlice/types'

import type { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'

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
  accountIds: AccountId[]
  from: string
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
  searchQuery: string
  limit: number
  txStatus: TxStatus
  timeframe: HistoryTimeframe
  onlyConnectedChains: boolean
  parser: TxMetadata['parser']
  memo: common.thormaya.TxMetadata['memo']
  hopIndex: number
  tradeId: TradeQuote['id']
  quoteId: string
  cowSwapQuoteId: number
  swapId: string
}>

type ParamFilterKey = keyof ParamFilter

export const selectParamFromFilter = <T extends ParamFilterKey>(param: T) =>
  createCachedSelector(
    (_state: ReduxState, filter: Pick<ParamFilter, T> | null): ParamFilter[T] | undefined =>
      filter?.[param],
    param => param,
  )(
    (_state: ReduxState, filter: Pick<ParamFilter, T> | null) =>
      `${param}-${filter?.[param] ?? param}`,
  )

export const selectRequiredParamFromFilter = <T extends ParamFilterKey>(param: T) =>
  createCachedSelector(
    (_state: ReduxState, filter: Required<Pick<ParamFilter, T>>): NonNullable<ParamFilter[T]> =>
      filter[param] as NonNullable<ParamFilter[T]>,
    (paramValue: NonNullable<ParamFilter[T]>): NonNullable<ParamFilter[T]> => paramValue,
  )((_state: ReduxState, filter: Required<Pick<ParamFilter, T>>) => `${param}-${filter[param]}`)

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
export const selectSearchQueryFromFilter = selectParamFromFilter('searchQuery')
export const selectLimitParamFromFilter = selectParamFromFilter('limit')
export const selectTxStatusParamFromFilter = selectParamFromFilter('txStatus')
export const selectTimeframeParamFromFilter = selectParamFromFilter('timeframe')
export const selectOnlyConnectedChainsParamFromFilter = selectParamFromFilter('onlyConnectedChains')
export const selectParserParamFromFilter = selectParamFromFilter('parser')
export const selectMemoParamFromFilter = selectParamFromFilter('memo')
export const selectSwapIdParamFromFilter = selectParamFromFilter('swapId')
export const selectHopIndexParamFromRequiredFilter = selectRequiredParamFromFilter('hopIndex')
export const selectTradeIdParamFromRequiredFilter = selectRequiredParamFromFilter('tradeId')
export const selectQuoteIdParamFromRequiredFilter = selectRequiredParamFromFilter('quoteId')
export const selectCowSwapQuoteIdParamFromRequiredFilter =
  selectRequiredParamFromFilter('cowSwapQuoteId')
export const selectSwapIdParamFromRequiredFilter = selectRequiredParamFromFilter('swapId')
