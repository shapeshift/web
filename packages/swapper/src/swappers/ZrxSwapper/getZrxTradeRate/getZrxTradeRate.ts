import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeRateInput,
  SingleHopTradeRateSteps,
  SwapErrorRight,
  TradeRate,
} from '../../../types'
import { SwapperName } from '../../../types'
import { fetchZrxPrice } from '../utils/fetchFromZrx'
import {
  assertValidTrade,
  calculateBuyAmountBeforeFeesCryptoBaseUnit,
  calculateRate,
  getProtocolFees,
} from '../utils/helpers/helpers'

export async function getZrxTradeRate(
  input: GetEvmTradeRateInput,
  assetsById: AssetsByIdPartial,
  zrxBaseUrl: string,
): Promise<Result<TradeRate, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    potentialAffiliateBps,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx)

  const maybeZrxPriceResponse = await fetchZrxPrice({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    // Cross-account not supported for ZRX
    sellAddress: receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    zrxBaseUrl,
  })

  if (maybeZrxPriceResponse.isErr()) return Err(maybeZrxPriceResponse.unwrapErr())
  const zrxPriceResponse = maybeZrxPriceResponse.unwrap()

  const { buyAmount, sellAmount, fees, totalNetworkFee } = zrxPriceResponse

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  const buyAmountBeforeFeesCryptoBaseUnit = calculateBuyAmountBeforeFeesCryptoBaseUnit({
    buyAmount,
    fees,
    buyAsset,
    sellAsset,
  })

  return Ok({
    id: uuid(),
    accountNumber: undefined,
    receiveAddress: undefined,
    potentialAffiliateBps,
    affiliateBps,
    // Slippage protection is always enabled for 0x api v2 unlike api v1 which was only supported on specific pairs.
    slippageTolerancePercentageDecimal,
    rate,
    steps: [
      {
        estimatedExecutionTimeMs: undefined,
        buyAsset,
        sellAsset,
        accountNumber,
        rate,
        feeData: {
          protocolFees: getProtocolFees({ fees, sellAsset, assetsById }),
          networkFeeCryptoBaseUnit: totalNetworkFee,
        },
        buyAmountBeforeFeesCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit: buyAmount,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        source: SwapperName.Zrx,
      },
    ] as SingleHopTradeRateSteps,
  })
}
