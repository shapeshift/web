import { SwapperName } from '@shapeshiftoss/swapper'
import createCachedSelector from 're-reselect'
import type { SwapperState } from 'components/Trade/SwapperProvider/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'

/*
  Cross-account trading means trades that are either:
    - Trades between assets on the same chain but different accounts
    - Trades between assets on different chains (and possibly different accounts)
   When adding a new swapper, ensure that `true` is returned here if either of the above apply.
   */
export const selectSwapperSupportsCrossAccountTrade = createCachedSelector(
  (state: SwapperState) => state.activeSwapperWithMetadata?.swapper,
  (activeSwapper): boolean => {
    switch (activeSwapper?.name) {
      case SwapperName.Thorchain:
      case SwapperName.Osmosis:
        return true
      case SwapperName.Zrx:
      case SwapperName.CowSwap:
        return false
      default:
        return false
    }
  },
)(state => state.activeSwapperWithMetadata?.swapper?.name ?? 'undefined')

export const selectTotalReceiveAmountCryptoPrecision = (state: SwapperState) => {
  const { quote, buyAssetFiatRate } = state
  const buyAmountCryptoPrecision =
    quote && fromBaseUnit(quote.buyAmountCryptoBaseUnit, quote.buyAsset.precision)
  const buyAssetTradeFeeCryptoPrecision =
    quote && buyAssetFiatRate
      ? bnOrZero(quote.feeData.buyAssetTradeFeeUsd).div(buyAssetFiatRate)
      : undefined

  const totalReceiveAmountCryptoPrecision = buyAssetTradeFeeCryptoPrecision
    ? bnOrZero(buyAmountCryptoPrecision).minus(buyAssetTradeFeeCryptoPrecision).toString()
    : undefined

  return totalReceiveAmountCryptoPrecision
}
