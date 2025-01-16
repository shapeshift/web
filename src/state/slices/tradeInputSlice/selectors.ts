import { createSelector } from '@reduxjs/toolkit'
import type { TradeQuote, TradeRate } from '@shapeshiftoss/swapper'
import { isExecutableTradeStep } from '@shapeshiftoss/swapper'
import { bn } from '@shapeshiftoss/utils'
import type { Selector } from 'react-redux'
import type { ReduxState } from 'state/reducer'
import { createDeepEqualOutputSelector } from 'state/selector-utils'

import { createTradeInputBaseSelectors } from '../common/tradeInputBase/createTradeInputBaseSelectors'
import { selectAccountIdByAccountNumberAndChainId } from '../portfolioSlice/selectors'
import type { TradeInputState } from './tradeInputSlice'

// Shared selectors from the base trade input slice that handle common functionality like input
// assets, rates, and slippage preferences
export const {
  selectInputBuyAsset,
  selectInputSellAsset,
  selectInputSellAssetUsdRate,
  selectInputBuyAssetUsdRate,
  selectInputSellAssetUserCurrencyRate,
  selectInputBuyAssetUserCurrencyRate,
  selectInputSellAmountCryptoBaseUnit,
  selectManualReceiveAddress,
  selectIsManualReceiveAddressValidating,
  selectIsManualReceiveAddressEditing,
  selectIsManualReceiveAddressValid,
  selectInputSellAmountUsd,
  selectInputSellAmountUserCurrency,
  selectSellAssetBalanceCryptoBaseUnit,
  selectIsInputtingFiatSellAmount,
  selectHasUserEnteredAmount,
  selectInputSellAmountCryptoPrecision,
  // We don't want to export some of the selectors so we can give them more specific names
  ...privateSelectors
} = createTradeInputBaseSelectors<TradeInputState>('tradeInput')

const { selectBaseSlice, selectSellAccountId, selectBuyAccountId } = privateSelectors

// We rename this to include the specific hop to avoid confusion in multi-hop contexts
// Selects the account ID we're selling from for the first hop
export const selectFirstHopSellAccountId = selectSellAccountId

// We rename this to include the specific hop to avoid confusion in multi-hop contexts
// Selects the account ID we're buying into for the last hop
export const selectLastHopBuyAccountId = selectBuyAccountId

// All the below selectors are re-declared from tradeQuoteSlice/selectors to avoid circular deps
// and allow selectSecondHopSellAccountId to keep a pwetty API

const selectTradeQuoteSlice = (state: ReduxState) => state.tradeQuoteSlice

// Return the confirmed quote for trading. If it doesn't exist, it's not safe to trade.
// This mechanism prevents the quote changing during trade execution, but has implications on the UI
// displaying stale data. To prevent displaying stale data, we must ensure to clear the
// confirmedQuote when not executing a trade.
export const selectConfirmedQuote: Selector<ReduxState, TradeQuote | TradeRate | undefined> =
  createDeepEqualOutputSelector(selectTradeQuoteSlice, tradeQuote => tradeQuote.confirmedQuote)

const selectSecondHop: Selector<ReduxState, TradeQuote['steps'][number] | undefined> =
  createDeepEqualOutputSelector(selectConfirmedQuote, confirmedQuote =>
    confirmedQuote ? confirmedQuote.steps[1] : undefined,
  )

export const selectIsActiveQuoteMultiHop: Selector<ReduxState, boolean | undefined> =
  createSelector(selectConfirmedQuote, confirmedQuote =>
    confirmedQuote ? confirmedQuote.steps.length > 1 : undefined,
  )

export const selectUserSlippagePercentage = createSelector(
  selectBaseSlice,
  tradeInput => tradeInput.slippagePreferencePercentage,
)

// User input comes in as an actual percentage e.g 1 for 1%, so we need to convert it to a decimal e.g 0.01 for 1%
export const selectUserSlippagePercentageDecimal = createSelector(
  selectUserSlippagePercentage,
  slippagePercentage => {
    if (!slippagePercentage) return
    return bn(slippagePercentage).div(100).toString()
  },
)

// if multi-hop, selects the account ID we're selling from for fee asset of the last hop and its account number
// else, selects none because there's obviously no AccountId if there's no hop
export const selectSecondHopSellAccountId = createSelector(
  selectAccountIdByAccountNumberAndChainId,
  selectIsActiveQuoteMultiHop,
  selectSecondHop,
  (accountIdsByAccountNumberAndChainId, isMultiHopTrade, secondHop) => {
    // No second hop sellAccountId if there is no second hop
    if (!isMultiHopTrade || !secondHop) return
    if (!isExecutableTradeStep(secondHop)) return

    const secondHopSellAssetAccountNumber = secondHop.accountNumber
    const secondHopSellAssetChainId = secondHop.sellAsset.chainId

    const chainIdAccountNumbers =
      accountIdsByAccountNumberAndChainId[secondHopSellAssetAccountNumber]
    if (!chainIdAccountNumbers) return
    return chainIdAccountNumbers?.[secondHopSellAssetChainId]
  },
)
