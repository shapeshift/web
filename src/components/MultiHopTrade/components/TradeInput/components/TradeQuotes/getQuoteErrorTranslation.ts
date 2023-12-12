import type { AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { type SwapErrorRight, SwapErrorType } from '@shapeshiftoss/swapper'
import type { Asset, PartialRecord } from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'
import { baseUnitToHuman } from 'lib/bignumber/bignumber'

export const quoteStatusTranslation = (
  swapError: SwapErrorRight | undefined,
  assetsById: PartialRecord<AssetId, Asset>,
): [string] | [string, InterpolationOptions] => {
  const code = swapError?.code

  switch (code) {
    case SwapErrorType.TRADING_HALTED:
      return ['trade.errors.tradingNotActiveNoAssetSymbol']
    case SwapErrorType.TRADE_QUOTE_AMOUNT_TOO_SMALL: {
      const {
        minAmountCryptoBaseUnit,
        assetId,
      }: { minAmountCryptoBaseUnit?: string; assetId?: AssetId } = swapError?.details ?? {}

      const asset = assetId && assetsById[assetId]

      if (!minAmountCryptoBaseUnit || !asset) return ['trade.errors.amountTooSmallUnknownMinimum']

      const minAmountCryptoHuman = baseUnitToHuman({
        value: minAmountCryptoBaseUnit,
        inputExponent: asset.precision,
      })
      const formattedAmount = bnOrZero(minAmountCryptoHuman).decimalPlaces(6)
      const minimumAmountUserMessage = `${formattedAmount} ${asset.symbol}`

      return ['trade.errors.amountTooSmall', { minLimit: minimumAmountUserMessage }]
    }
    case SwapErrorType.UNSUPPORTED_PAIR:
      return ['trade.errors.unsupportedTradePair']
    default:
      return ['trade.errors.quoteError']
  }
}
