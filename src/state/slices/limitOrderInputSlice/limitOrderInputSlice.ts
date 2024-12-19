import type { PayloadAction } from '@reduxjs/toolkit'
import { foxAssetId, usdcAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { assertUnreachable, bn, bnOrZero } from '@shapeshiftoss/utils'
import pick from 'lodash/pick'
import { localAssetData } from 'lib/asset-service'

import { defaultAsset } from '../assetsSlice/assetsSlice'
import type {
  BaseReducers,
  TradeInputBaseState,
} from '../common/tradeInputBase/createTradeInputBaseSlice'
import { createTradeInputBaseSlice } from '../common/tradeInputBase/createTradeInputBaseSlice'
import { ExpiryOption, LimitPriceMode, PriceDirection } from './constants'
import { getOppositePriceDirection } from './helpers'

export type LimitOrderInputState = {
  limitPriceDirection: PriceDirection
  limitPrice: Record<PriceDirection, string>
  limitPriceMode: LimitPriceMode
  expiry: ExpiryOption
} & TradeInputBaseState

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
  slippagePreferencePercentage: undefined,
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
            : bn(1).div(marketPriceBuyAsset).toFixed(),
        } as Record<PriceDirection, string>

        return
      }

      const multiplier = (() => {
        switch (state.limitPriceMode) {
          case LimitPriceMode.Market:
            return '1.00'
          case LimitPriceMode.OnePercent:
            return '1.01'
          case LimitPriceMode.TwoPercent:
            return '1.02'
          case LimitPriceMode.FivePercent:
            return '1.05'
          case LimitPriceMode.TenPercent:
            return '1.10'
          default:
            assertUnreachable(state.limitPriceMode)
        }
      })()

      const adjustedLimitPriceBuyAsset = bn(marketPriceBuyAsset).times(multiplier).toFixed()

      state.limitPrice = {
        [PriceDirection.BuyAssetDenomination]: adjustedLimitPriceBuyAsset,
        [PriceDirection.SellAssetDenomination]: bn(1).div(adjustedLimitPriceBuyAsset).toFixed(),
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
