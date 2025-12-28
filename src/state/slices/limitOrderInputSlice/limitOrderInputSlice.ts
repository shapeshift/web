import type { PayloadAction } from '@reduxjs/toolkit'
import { foxAssetId, usdcAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { assertUnreachable, bn, bnOrZero } from '@shapeshiftoss/utils'
import pick from 'lodash/pick'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import type {
  BaseReducers,
  TradeInputBaseState,
} from '../common/tradeInputBase/createTradeInputBaseSlice'
import { createTradeInputBaseSlice } from '../common/tradeInputBase/createTradeInputBaseSlice'
import { ExpiryOption, LimitPriceMode, PriceDirection } from './constants'
import { getOppositePriceDirection } from './helpers'

import { getAssetService } from '@/lib/asset-service'

export type LimitPriceByDirection = {
  [PriceDirection.BuyAssetDenomination]: string
  [PriceDirection.SellAssetDenomination]: string
}

export type LimitOrderInputState = {
  limitPriceDirection: PriceDirection
  limitPrice: LimitPriceByDirection
  limitPriceMode: LimitPriceMode
  expiry: ExpiryOption
} & TradeInputBaseState

const localAssetData = getAssetService().assetsById

const initialState: LimitOrderInputState = {
  buyAsset: localAssetData[foxAssetId] ?? defaultAsset,
  sellAsset: localAssetData[usdcAssetId] ?? defaultAsset,
  sellAccountId: undefined,
  buyAccountId: undefined,
  sellAmountCryptoPrecision: '0',
  isInputtingFiatSellAmount: false,
  manualReceiveAddress: undefined,
  isManualReceiveAddressValidating: false,
  isManualReceiveAddressValid: undefined,
  isManualReceiveAddressEditing: false,
  selectedSellAssetChainId: 'All',
  selectedBuyAssetChainId: 'All',
  limitPriceDirection: PriceDirection.BuyAssetDenomination,
  limitPrice: {
    [PriceDirection.BuyAssetDenomination]: '0',
    [PriceDirection.SellAssetDenomination]: '0',
  },
  limitPriceMode: LimitPriceMode.Market,
  expiry: ExpiryOption.SevenDays,
}

const resetLimitOrderConfig = (state: LimitOrderInputState) => {
  Object.assign(
    state,
    pick(initialState, ['limitPrice', 'limitPriceDirection', 'limitPriceMode', 'expiry']),
  )
}

export const limitOrderInput = createTradeInputBaseSlice({
  name: 'limitOrderInput',
  initialState,
  // Add any reducers specific to limitOrderInput slice here that aren't shared with other slices
  extraReducers: (baseReducers: BaseReducers<LimitOrderInputState>) => ({
    setLimitPrice: (
      state: LimitOrderInputState,
      action: PayloadAction<{ marketPriceBuyAsset: string }>,
    ) => {
      const { marketPriceBuyAsset } = action.payload

      if (state.limitPriceMode === LimitPriceMode.CustomValue) {
        const oppositePriceDirection = getOppositePriceDirection(state.limitPriceDirection)

        state.limitPrice = {
          [state.limitPriceDirection]: marketPriceBuyAsset,
          [oppositePriceDirection]: bnOrZero(marketPriceBuyAsset).isZero()
            ? '0'
            : bn(1).div(marketPriceBuyAsset).toFixed(state.sellAsset.precision),
        } as Record<PriceDirection, string>

        return
      }

      const multiplier = (() => {
        switch (state.limitPriceMode) {
          case LimitPriceMode.Market:
            return '1.00'
          default:
            return assertUnreachable(state.limitPriceMode)
        }
      })()

      const adjustedLimitPriceBuyAsset = bn(marketPriceBuyAsset).times(multiplier).toFixed()

      state.limitPrice = {
        [PriceDirection.BuyAssetDenomination]: adjustedLimitPriceBuyAsset,
        [PriceDirection.SellAssetDenomination]: bn(1)
          .div(adjustedLimitPriceBuyAsset)
          .toFixed(state.sellAsset.precision),
      }
    },
    setLimitPriceMode: (state: LimitOrderInputState, action: PayloadAction<LimitPriceMode>) => {
      state.limitPriceMode = action.payload
    },
    setLimitPriceDirection: (
      state: LimitOrderInputState,
      action: PayloadAction<PriceDirection>,
    ) => {
      state.limitPriceDirection = action.payload
    },
    setExpiry: (state: LimitOrderInputState, action: PayloadAction<ExpiryOption>) => {
      state.expiry = action.payload
    },
    setBuyAsset: (state: LimitOrderInputState, action: PayloadAction<Asset>) => {
      baseReducers.setBuyAsset(state, action)
      resetLimitOrderConfig(state)
    },
    setSellAsset: (state: LimitOrderInputState, action: PayloadAction<Asset>) => {
      baseReducers.setSellAsset(state, action)
      resetLimitOrderConfig(state)
    },
    setSellAmountCryptoPrecision: (state: LimitOrderInputState, action: PayloadAction<string>) => {
      state.sellAmountCryptoPrecision = bnOrZero(action.payload).toString()

      if (bnOrZero(state.limitPrice[state.limitPriceDirection]).isZero()) {
        state.limitPriceMode = LimitPriceMode.Market
      }
    },
    switchAssets: (
      state: LimitOrderInputState,
      action: PayloadAction<{
        sellAssetUsdRate: string | undefined
        buyAssetUsdRate: string | undefined
      }>,
    ) => {
      baseReducers.switchAssets(state, action)
      resetLimitOrderConfig(state)
    },
  }),
})
