import type { Asset } from '@keepkey/asset-service'
import { getTradeAmountConstants } from 'components/Trade/hooks/useGetTradeAmounts'
import { TradeAmountInputField } from 'components/Trade/types'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'

export type CalculateAmountsArgs = {
  amount: string
  buyAsset: Asset
  sellAsset: Asset
  buyAssetUsdRate: string
  sellAssetUsdRate: string
  action: TradeAmountInputField
  selectedCurrencyToUsdRate: BigNumber
  buyAssetTradeFeeUsd: BigNumber
  sellAssetTradeFeeUsd: BigNumber
}

type CalculateAmountsReturn = {
  sellAmountSellAssetBaseUnit: string
  buyAmountBuyAssetBaseUnit: string
  fiatSellAmount: string
  fiatBuyAmount: string
}

export const calculateAmounts = (args: CalculateAmountsArgs): CalculateAmountsReturn => {
  const {
    buyAmountBeforeFeesFiat,
    sellAmountBeforeFeesFiat,
    sellAmountPlusFeesFiat,
    buyAmountAfterFeesFiat,
    buyAmountAfterFeesBaseUnit,
    sellAmountBeforeFeesBaseUnit,
    sellAmountPlusFeesBaseUnit,
    buyAmountBeforeFeesBaseUnit,
  } = getTradeAmountConstants(args)
  const { action, amount, sellAsset, buyAsset } = args
  switch (action) {
    case TradeAmountInputField.SELL_CRYPTO: {
      return {
        sellAmountSellAssetBaseUnit: toBaseUnit(amount, sellAsset.precision),
        buyAmountBuyAssetBaseUnit: buyAmountAfterFeesBaseUnit,
        fiatSellAmount: sellAmountBeforeFeesFiat,
        fiatBuyAmount: buyAmountAfterFeesFiat,
      }
    }
    case TradeAmountInputField.SELL_FIAT: {
      return {
        sellAmountSellAssetBaseUnit: sellAmountBeforeFeesBaseUnit,
        buyAmountBuyAssetBaseUnit: buyAmountAfterFeesBaseUnit,
        fiatSellAmount: bnOrZero(amount).toFixed(2),
        fiatBuyAmount: buyAmountAfterFeesFiat,
      }
    }
    case TradeAmountInputField.BUY_CRYPTO: {
      return {
        sellAmountSellAssetBaseUnit: sellAmountPlusFeesBaseUnit,
        buyAmountBuyAssetBaseUnit: toBaseUnit(amount, buyAsset.precision),
        fiatSellAmount: sellAmountPlusFeesFiat,
        fiatBuyAmount: buyAmountBeforeFeesFiat,
      }
    }
    case TradeAmountInputField.BUY_FIAT: {
      return {
        sellAmountSellAssetBaseUnit: sellAmountPlusFeesBaseUnit,
        buyAmountBuyAssetBaseUnit: buyAmountBeforeFeesBaseUnit,
        fiatSellAmount: sellAmountPlusFeesFiat,
        fiatBuyAmount: bnOrZero(amount).toFixed(2),
      }
    }
    default:
      return {
        sellAmountSellAssetBaseUnit: '0',
        buyAmountBuyAssetBaseUnit: '0',
        fiatSellAmount: '0',
        fiatBuyAmount: '0',
      }
  }
}
