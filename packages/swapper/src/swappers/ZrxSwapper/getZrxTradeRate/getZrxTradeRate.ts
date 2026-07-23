import { PERMIT2_CONTRACT } from '@shapeshiftoss/contracts'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeRateInput,
  SingleHopTradeRateSteps,
  SwapErrorRight,
  SwapperDeps,
  TradeRate,
} from '../../../types'
import { SwapperName } from '../../../types'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { fetchZrxPrice } from '../utils/fetchFromZrx'
import { getZrxStepData } from '../utils/getZrxStepData'
import {
  assertValidTrade,
  calculateBuyAmountBeforeFeesCryptoBaseUnit,
  calculateRate,
  getProtocolFees,
} from '../utils/helpers/helpers'

export async function getZrxTradeRate(
  input: GetEvmTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate, SwapErrorRight>> {
  const { assetsById } = deps
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
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
    zrxBaseUrl: deps.config.VITE_ZRX_BASE_URL,
  })

  if (maybeZrxPriceResponse.isErr()) return Err(maybeZrxPriceResponse.unwrapErr())
  const zrxPriceResponse = maybeZrxPriceResponse.unwrap()

  const { buyAmount, sellAmount, fees, totalNetworkFee, route } = zrxPriceResponse

  const isWrappedNative = route.fills.some(
    fill => fill.source === 'Wrapped_Native' && fill.proportionBps === '10000',
  )

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  const { networkFeeCryptoBaseUnit } = await getZrxStepData({
    type: 'rate',
    input,
    sellAsset,
    totalNetworkFee,
    deps,
  })

  const buyAmountBeforeFeesCryptoBaseUnit = calculateBuyAmountBeforeFeesCryptoBaseUnit({
    buyAmount,
    fees,
    buyAsset,
    sellAsset,
  })

  return Ok({
    id: uuid(),
    quoteOrRate: 'rate' as const,
    accountNumber: undefined,
    receiveAddress,
    affiliateBps,
    // Slippage protection is always enabled for 0x api v2 unlike api v1 which was only supported on specific pairs.
    slippageTolerancePercentageDecimal,
    rate,
    swapperName: SwapperName.Zrx,
    steps: [
      {
        // Assume instant execution since this is a same-chain AMM Tx which will happen within the same block
        estimatedExecutionTimeMs: 0,
        allowanceContract:
          isNativeEvmAsset(sellAsset.assetId) || isWrappedNative ? undefined : PERMIT2_CONTRACT,
        buyAsset,
        sellAsset,
        accountNumber,
        rate,
        feeData: {
          protocolFees: getProtocolFees({ fees, sellAsset, assetsById }),
          networkFeeCryptoBaseUnit,
        },
        buyAmountBeforeFeesCryptoBaseUnit,
        buyAmountAfterFeesCryptoBaseUnit: buyAmount,
        sellAmountIncludingProtocolFeesCryptoBaseUnit,
        source: SwapperName.Zrx,
        affiliateFee: buildAffiliateFee({
          strategy: 'buy_asset',
          affiliateBps,
          sellAsset,
          buyAsset,
          sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          buyAmountCryptoBaseUnit: buyAmount,
        }),
      },
    ] as SingleHopTradeRateSteps,
  })
}
