import { QueryStatus } from '@reduxjs/toolkit/query'
import { solAssetId } from '@shapeshiftoss/caip'
import type { SwapperName } from '@shapeshiftoss/swapper'
import type { PartialRecord } from '@shapeshiftoss/types'

import type { TradeQuoteOrRateRequest } from './types'

import { getEnabledSwappers } from '@/state/helpers'
import type { ReduxState } from '@/state/reducer'
import { createDeepEqualOutputSelector } from '@/state/selector-utils'
import { selectWalletName } from '@/state/slices/common-selectors'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { selectInputBuyAsset, selectInputSellAsset } from '@/state/slices/tradeInputSlice/selectors'

const selectSwapperApiQueries = (state: ReduxState) => state.swapperApi.queries

export const selectIsBatchTradeRateQueryLoading = createDeepEqualOutputSelector(
  selectSwapperApiQueries,
  queries => {
    let latestQueryInfo
    let latestStartedTimeStamp = 0

    // Find the most recent batch trade rate query
    for (const [queryKey, queryInfo] of Object.entries(queries)) {
      if (!queryKey.startsWith('getTradeRates')) continue

      const startedTimeStamp = queryInfo?.startedTimeStamp ?? 0
      if (startedTimeStamp > latestStartedTimeStamp) {
        latestStartedTimeStamp = startedTimeStamp
        latestQueryInfo = queryInfo
      }
    }

    if (!latestQueryInfo) return false

    return [QueryStatus.uninitialized, QueryStatus.pending, undefined].includes(
      latestQueryInfo.status,
    )
  },
)

export const selectIsTradeQuoteApiQueryPending = createDeepEqualOutputSelector(
  selectSwapperApiQueries,
  preferences.selectors.selectFeatureFlags,
  selectInputBuyAsset,
  selectInputSellAsset,
  selectWalletName,
  selectIsBatchTradeRateQueryLoading,
  (queries, featureFlags, buyAsset, sellAsset, walletName, isBatchTradeRateQueryLoading) => {
    if (isBatchTradeRateQueryLoading) {
      const isSolBuyAssetId = buyAsset.assetId === solAssetId

      // No send address so always false
      const isCrossAccountTrade = false

      // If we're doing a bulk request then everything that's enabled is loading
      return getEnabledSwappers(
        featureFlags,
        isCrossAccountTrade,
        isSolBuyAssetId,
        walletName,
        sellAsset.assetId,
      )
    }

    const isLoadingBySwapperName: PartialRecord<SwapperName, boolean> = {}
    const latestTimestamps: PartialRecord<SwapperName, number> = {}

    for (const [queryKey, queryInfo] of Object.entries(queries)) {
      if (!queryKey.startsWith('getTradeQuote')) continue

      const swapperName = (queryInfo?.originalArgs as TradeQuoteOrRateRequest | undefined)
        ?.swapperName

      if (!swapperName) continue

      const startedTimeStamp = queryInfo?.startedTimeStamp ?? 0
      const latestTimestamp = latestTimestamps[swapperName]
      const isMostRecent = !latestTimestamp || startedTimeStamp > latestTimestamp

      if (isMostRecent) {
        latestTimestamps[swapperName] = startedTimeStamp
        isLoadingBySwapperName[swapperName] = [
          QueryStatus.uninitialized,
          QueryStatus.pending,
          undefined,
        ].includes(queryInfo?.status)
      }
    }

    return isLoadingBySwapperName
  },
)
