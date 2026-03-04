import { Err, Ok } from '@sniptt/monads'
import type { Quote } from '@ston-fi/omniston-sdk'
import { SettlementMethod } from '@ston-fi/omniston-sdk'

import type { GetTradeRateInput, TradeRate, TradeRateResult } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import type { OmnistonAssetAddress } from '../types'
import { STONFI_DEFAULT_SLIPPAGE_BPS, STONFI_QUOTE_TIMEOUT_MS } from '../utils/constants'
import {
  affiliateBpsToNumber,
  calculateRate,
  slippageDecimalToBps,
  tonAddressToOmnistonAddress,
  validateTonAssets,
  waitForQuote,
} from '../utils/helpers'
import { omnistonManager } from '../utils/omnistonManager'

const buildStonfiSpecific = (
  quote: Quote,
  bidAssetAddress: OmnistonAssetAddress,
  askAssetAddress: OmnistonAssetAddress,
) => ({
  quoteId: quote.quoteId,
  resolverId: quote.resolverId,
  resolverName: quote.resolverName,
  tradeStartDeadline: quote.tradeStartDeadline,
  gasBudget: quote.gasBudget,
  bidAssetAddress: quote.bidAssetAddress ?? bidAssetAddress,
  askAssetAddress: quote.askAssetAddress ?? askAssetAddress,
  bidUnits: quote.bidUnits,
  askUnits: quote.askUnits,
  referrerAddress: quote.referrerAddress,
  referrerFeeAsset: quote.referrerFeeAsset,
  referrerFeeUnits: quote.referrerFeeUnits,
  protocolFeeAsset: quote.protocolFeeAsset,
  protocolFeeUnits: quote.protocolFeeUnits,
  quoteTimestamp: quote.quoteTimestamp,
  estimatedGasConsumption: quote.estimatedGasConsumption,
  params: quote.params,
})

export const getTradeRate = async (input: GetTradeRateInput): Promise<TradeRateResult> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    slippageTolerancePercentageDecimal,
    affiliateBps,
  } = input

  const validation = validateTonAssets(sellAsset, buyAsset)
  if (!validation.isValid) {
    return validation.error
  }

  const { bidAssetAddress, askAssetAddress } = validation
  const omniston = omnistonManager.getInstance()

  try {
    const slippageBps = slippageDecimalToBps(
      slippageTolerancePercentageDecimal,
      STONFI_DEFAULT_SLIPPAGE_BPS,
    )

    const referrerFeeBps = affiliateBpsToNumber(affiliateBps)
    const tonTreasuryAddress = getTreasuryAddressFromChainId(sellAsset.chainId)
    const referrerAddress = tonAddressToOmnistonAddress(tonTreasuryAddress)

    const quoteResult = await waitForQuote(
      omniston,
      {
        settlementMethods: [SettlementMethod.SETTLEMENT_METHOD_SWAP],
        bidAssetAddress,
        askAssetAddress,
        amount: { bidUnits: sellAmountIncludingProtocolFeesCryptoBaseUnit },
        referrerAddress,
        referrerFeeBps,
        settlementParams: {
          maxPriceSlippageBps: slippageBps,
          gaslessSettlement: 'GASLESS_SETTLEMENT_PROHIBITED',
          flexibleReferrerFee: true,
        },
      },
      STONFI_QUOTE_TIMEOUT_MS,
    )

    if (quoteResult.type !== 'success') {
      return Err(
        makeSwapErrorRight({
          message: `[Stonfi] No quote available for this pair`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const quote = quoteResult.quote
    const buyAmountCryptoBaseUnit = quote.askUnits
    const networkFeeCryptoBaseUnit = quote.gasBudget

    const rate = calculateRate(
      buyAmountCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset.precision,
      sellAsset.precision,
    )

    const tradeRate: TradeRate = {
      id: quote.quoteId,
      rate,
      receiveAddress,
      affiliateBps,
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ?? String(STONFI_DEFAULT_SLIPPAGE_BPS / 10000),
      quoteOrRate: 'rate',
      swapperName: SwapperName.Stonfi,
      steps: [
        {
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            networkFeeCryptoBaseUnit,
            protocolFees: undefined,
          },
          rate,
          source: SwapperName.Stonfi,
          buyAsset,
          sellAsset,
          accountNumber: undefined,
          allowanceContract: '0x0000000000000000000000000000000000000000',
          estimatedExecutionTimeMs: 30000,
          stonfiSpecific: buildStonfiSpecific(quote, bidAssetAddress, askAssetAddress),
        },
      ],
    }

    return Ok([tradeRate])
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: `[Stonfi] Error getting rate: ${err}`,
        code: TradeQuoteError.QueryFailed,
        cause: err,
      }),
    )
  }
}
