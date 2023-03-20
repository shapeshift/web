import type { GasCost, Token } from '@lifi/sdk'
import type { Asset } from '@shapeshiftoss/asset-service'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { bn, convertPrecision } from 'lib/bignumber/bignumber'
import { getAssetBalance } from 'lib/swapper/LifiSwapper/utils/getAssetBalance/getAssetBalance'

export const checkBuyGasAssetBalance = (
  gasCosts: GasCost[],
  buyAsset: Asset,
  buyLifiToken: Token,
  accountNumber: number,
): void => {
  const buyGasCryptoLifiPrecision = gasCosts
    .filter(gasCost => gasCost.token.address === buyLifiToken.address)
    .reduce((acc, { amount }) => acc.plus(bn(amount)), bn(0))

  const buyGasCryptoPrecision = convertPrecision({
    value: buyGasCryptoLifiPrecision,
    inputPrecision: buyLifiToken.decimals,
    outputPrecision: buyAsset.precision,
  })

  if (buyGasCryptoPrecision.gt(0)) {
    const buyBalanceCryptoPrecision = getAssetBalance({
      asset: buyAsset,
      accountNumber,
      chainId: buyAsset.chainId,
      outputPrecision: buyAsset.precision,
    })

    if (buyBalanceCryptoPrecision.lt(buyGasCryptoPrecision)) {
      throw new SwapError('[getTradeQuote] insufficient balance to cover gas on receiving chain', {
        code: SwapErrorType.TRADE_QUOTE_FAILED,
        details: {
          buyAsset,
          buyBalanceCryptoPrecision,
        },
      })
    }
  }
}

export const assertNoAdditionalGasCostTokens = (
  gasCosts: GasCost[],
  sellLifiToken: Token,
  buyLifiToken: Token,
): void => {
  const additionalGasCostTokens = gasCosts
    .filter(
      gasCost =>
        gasCost.token.address !== sellLifiToken.address &&
        gasCost.token.address !== buyLifiToken.address,
    )
    .map(gasCost => gasCost.token)

  if (additionalGasCostTokens.length > 0) {
    throw new SwapError('[assertNoAdditionalGasCostTokens] multi token gas not supported', {
      code: SwapErrorType.TRADE_QUOTE_FAILED,
      details: { additionalGasCostTokens },
    })
  }
}
