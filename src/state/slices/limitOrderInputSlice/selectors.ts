import { createTradeInputBaseSelectors } from '../common/tradeInputBase/createTradeInputBaseSelectors'

// Shared selectors from the base trade input slice that handle common functionality like input
// assets, rates, and slippage preferences
export const {
  selectInputBuyAsset,
  selectInputSellAsset,
  selectInputSellAssetUsdRate,
  selectInputBuyAssetUsdRate,
  selectInputSellAssetUserCurrencyRate,
  selectInputBuyAssetUserCurrencyRate,
  selectUserSlippagePercentage,
  selectUserSlippagePercentageDecimal,
  selectSellAccountId,
  selectBuyAccountId,
  selectInputSellAmountCryptoBaseUnit,
  selectManualReceiveAddress,
  selectManualReceiveAddressIsValidating,
  selectManualReceiveAddressIsEditing,
  selectManualReceiveAddressIsValid,
  selectInputSellAmountUsd,
  selectInputSellAmountUserCurrency,
  selectSellAssetBalanceCryptoBaseUnit,
  selectIsInputtingFiatSellAmount,
  selectHasUserEnteredAmount,
  selectInputSellAmountCryptoPrecision,
} = createTradeInputBaseSelectors('limitOrderInput')
