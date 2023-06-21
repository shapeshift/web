import { createSelector } from '@reduxjs/toolkit'
import { QueryStatus } from '@reduxjs/toolkit/query'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import type { Selector } from 'reselect'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ProtocolFee, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable, isSome } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'
import { selectSwapperNameFromFilter } from 'state/selectors'
import { selectFeeAssetById } from 'state/slices/assetsSlice/selectors'
import {
  getHopTotalNetworkFeeFiatPrecision,
  getHopTotalProtocolFeesFiatPrecision,
  getNetReceiveAmountCryptoPrecision,
  getTotalNetworkFeeFiatPrecision,
  getTotalProtocolFeeByAsset,
} from 'state/slices/tradeQuoteSlice/helpers'

const selectTradeQuoteSlice = (state: ReduxState) => state.tradeQuoteSlice

interface QuerySubState {
  data?: Result<TradeQuote<ChainId, boolean>, SwapErrorRight>
  endpointName?: string
  fulfilledTimeStamp?: number
  originalArgs?: unknown
  requestId?: string
  startedTimeStamp?: number
  status?: QueryStatus
}

const selectFulfilledSwapperApiQueries = (state: ReduxState): QuerySubState[] =>
  (Object.values(state.swappersApi.queries) as QuerySubState[])
    .filter(query => query?.status === QueryStatus.fulfilled)
    .filter(isSome)

export const selectQuoteResultBySwapperName = createDeepEqualOutputSelector(
  selectFulfilledSwapperApiQueries,
  selectSwapperNameFromFilter,
  (queries, swapperName) => {
    if (!swapperName || queries?.length === 0) return undefined

    const query = queries.find(query => {
      const mappedSwapperName = (() => {
        switch (query.endpointName) {
          case 'getLifiTradeQuote':
            return SwapperName.LIFI
          case 'getThorTradeQuote':
            return SwapperName.Thorchain
          default:
            return undefined
        }
      })()
      return mappedSwapperName === swapperName
    })

    return query?.data
  },
)

export const selectQuoteBySwapperName = createDeepEqualOutputSelector(
  selectQuoteResultBySwapperName,
  quoteResult => {
    return quoteResult?.isOk() ? quoteResult.unwrap() : undefined
  },
)

export const selectQuoteErrorBySwapperName = createDeepEqualOutputSelector(
  selectQuoteResultBySwapperName,
  quoteResult => {
    return quoteResult?.isErr() ? quoteResult.unwrapErr() : undefined
  },
)

export const selectSelectedSwapperName: Selector<ReduxState, SwapperName | undefined> =
  createSelector(selectTradeQuoteSlice, swappers => swappers.swapperName)

// TODO(apotheosis): Cache based on quote ID
export const selectSelectedQuote: Selector<ReduxState, TradeQuote | undefined> =
  createDeepEqualOutputSelector(
    (state: ReduxState) =>
      selectQuoteBySwapperName(state, {
        swapperName: selectSelectedSwapperName(state),
      }),
    quote => quote,
  )

export const selectSelectedQuoteError: Selector<ReduxState, SwapErrorRight | undefined> =
  createDeepEqualOutputSelector(
    (state: ReduxState) =>
      selectQuoteErrorBySwapperName(state, {
        swapperName: selectSelectedSwapperName(state),
      }),
    quote => quote,
  )

/*
  Cross-account trading means trades that are either:
    - Trades between assets on the same chain but different accounts
    - Trades between assets on different chains (and possibly different accounts)
   When adding a new swapper, ensure that `true` is returned here if either of the above apply.
   */
export const selectSwapperSupportsCrossAccountTrade: Selector<ReduxState, boolean | undefined> =
  createSelector(selectSelectedSwapperName, selectedSwapperName => {
    if (selectedSwapperName === undefined) return undefined

    switch (selectedSwapperName) {
      case SwapperName.Thorchain:
      case SwapperName.Osmosis:
        return true
      // NOTE: Before enabling cross-account for LIFI and OneInch - we must pass the sending address
      // to the swappers up so allowance checks work. They're currently using the receive address
      // assuming it's the same address as the sending address.
      case SwapperName.LIFI:
      case SwapperName.OneInch:
      case SwapperName.Zrx:
      case SwapperName.CowSwap:
      case SwapperName.Test:
        return false
      default:
        assertUnreachable(selectedSwapperName)
    }
  })

export const selectHopTotalProtocolFeesFiatPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    selectSelectedQuote,
    (_state: ReduxState, step: 0 | 1) => step,
    (quote, step) =>
      quote && quote.steps[step]
        ? getHopTotalProtocolFeesFiatPrecision(quote.steps[step])
        : undefined,
  )

export const selectHopTotalNetworkFeeFiatPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    selectSelectedQuote,
    (_state: ReduxState, step: 0 | 1) => step,
    (quote, step) =>
      quote && quote.steps[step]
        ? getHopTotalNetworkFeeFiatPrecision(quote.steps[step])
        : undefined,
  )

export const selectNetReceiveAmountCryptoPrecision: Selector<ReduxState, string | undefined> =
  createSelector(selectSelectedQuote, selectSelectedSwapperName, (quote, swapperName) =>
    quote && swapperName ? getNetReceiveAmountCryptoPrecision({ quote, swapperName }) : undefined,
  )

export const selectTotalNetworkFeeFiatPrecision: Selector<ReduxState, string | undefined> =
  createSelector(selectSelectedQuote, quote =>
    quote ? getTotalNetworkFeeFiatPrecision(quote) : undefined,
  )

export const selectTotalProtocolFeeByAsset: Selector<
  ReduxState,
  Record<AssetId, ProtocolFee> | undefined
> = createDeepEqualOutputSelector(selectSelectedQuote, quote =>
  quote ? getTotalProtocolFeeByAsset(quote) : undefined,
)

export const selectFirstHop: Selector<ReduxState, TradeQuote['steps'][number] | undefined> =
  createDeepEqualOutputSelector(selectSelectedQuote, quote => (quote ? quote.steps[0] : undefined))

export const selectLastHop: Selector<ReduxState, TradeQuote['steps'][number] | undefined> =
  createDeepEqualOutputSelector(selectSelectedQuote, quote =>
    quote ? quote.steps[quote.steps.length - 1] : undefined,
  )

export const selectFirstHopSellAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.sellAsset : undefined,
  )

export const selectFirstHopBuyAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.buyAsset : undefined,
  )

export const selectLastHopSellAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectLastHop, lastHop => (lastHop ? lastHop.sellAsset : undefined))

export const selectLastHopBuyAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(selectLastHop, lastHop => (lastHop ? lastHop.buyAsset : undefined))

export const selectSellAmountCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectFirstHop, firstHop =>
    firstHop ? firstHop.sellAmountBeforeFeesCryptoBaseUnit : undefined,
  )

export const selectSellAmountCryptoPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    [selectFirstHopSellAsset, selectSellAmountCryptoBaseUnit],
    (firstHopSellAsset, sellAmountCryptoBaseUnit) =>
      firstHopSellAsset
        ? fromBaseUnit(bnOrZero(sellAmountCryptoBaseUnit), firstHopSellAsset?.precision)
        : undefined,
  )

export const selectFirstHopSellFeeAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(
    (state: ReduxState) => selectFeeAssetById(state, selectFirstHopSellAsset(state)?.assetId ?? ''),
    firstHopSellFeeAsset => firstHopSellFeeAsset,
  )

export const selectLastHopSellFeeAsset: Selector<ReduxState, Asset | undefined> =
  createDeepEqualOutputSelector(
    (state: ReduxState) => selectFeeAssetById(state, selectLastHopSellAsset(state)?.assetId ?? ''),
    lastHopSellFeeAsset => lastHopSellFeeAsset,
  )

// when trading from fee asset, the value of TX in fee asset is deducted
export const selectFirstHopTradeDeductionCryptoPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    selectFirstHopSellFeeAsset,
    selectFirstHopSellAsset,
    selectSellAmountCryptoPrecision,
    (firstHopSellFeeAsset, firstHopSellAsset, sellAmountCryptoPrecision) =>
      firstHopSellFeeAsset?.assetId === firstHopSellAsset?.assetId
        ? bnOrZero(sellAmountCryptoPrecision).toFixed()
        : bn(0).toFixed(),
  )

// TODO(woodenfurniture): update swappers to specify this as with protocol fees
export const selectNetworkFeeRequiresBalance: Selector<ReduxState, boolean> = createSelector(
  selectSelectedSwapperName,
  (swapperName): boolean => swapperName === SwapperName.CowSwap,
)

export const selectFirstHopNetworkFeeCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectFirstHop, firstHop => firstHop?.feeData.networkFeeCryptoBaseUnit)

export const selectLastHopNetworkFeeCryptoBaseUnit: Selector<ReduxState, string | undefined> =
  createSelector(selectLastHop, lastHop => lastHop?.feeData.networkFeeCryptoBaseUnit)
export const selectFirstHopNetworkFeeCryptoPrecision: Selector<ReduxState, string | undefined> =
  createSelector(
    selectNetworkFeeRequiresBalance,
    selectFirstHopSellFeeAsset,
    selectFirstHopNetworkFeeCryptoBaseUnit,
    (networkFeeRequiresBalance, firstHopSellFeeAsset, firstHopNetworkFeeCryptoBaseUnit) =>
      networkFeeRequiresBalance && firstHopSellFeeAsset
        ? fromBaseUnit(bnOrZero(firstHopNetworkFeeCryptoBaseUnit), firstHopSellFeeAsset.precision)
        : bn(0).toFixed(),
  )

export const selectLastHopNetworkFeeCryptoPrecision: Selector<ReduxState, string> = createSelector(
  selectNetworkFeeRequiresBalance,
  selectLastHopSellFeeAsset,
  selectLastHopNetworkFeeCryptoBaseUnit,
  (networkFeeRequiresBalance, lastHopSellFeeAsset, lastHopNetworkFeeCryptoBaseUnit) =>
    networkFeeRequiresBalance && lastHopSellFeeAsset
      ? fromBaseUnit(bnOrZero(lastHopNetworkFeeCryptoBaseUnit), lastHopSellFeeAsset.precision)
      : bn(0).toFixed(),
)
