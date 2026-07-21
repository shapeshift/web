import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { PERMIT2_CONTRACT } from '@shapeshiftoss/contracts'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInputBase,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { buildAffiliateFee } from '../../utils/affiliateFee'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { fetchZrxQuote } from '../utils/fetchFromZrx'
import { getZrxStepData } from '../utils/getZrxStepData'
import {
  assertValidTrade,
  calculateBuyAmountBeforeFeesCryptoBaseUnit,
  calculateRate,
  getProtocolFees,
} from '../utils/helpers/helpers'

export async function getZrxTradeQuote(
  input: GetEvmTradeQuoteInputBase,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  assetsById: AssetsByIdPartial,
  zrxBaseUrl: string,
): Promise<Result<TradeQuote, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    affiliateBps,
    chainId,
    supportsEIP1559,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const assertion = assertValidTrade({ buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const slippageTolerancePercentageDecimal =
    input.slippageTolerancePercentageDecimal ??
    getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Zrx)

  const maybeZrxQuoteResponse = await fetchZrxQuote({
    buyAsset,
    sellAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    // Cross-account not supported for ZRX
    sellAddress: receiveAddress,
    affiliateBps,
    slippageTolerancePercentageDecimal,
    zrxBaseUrl,
  })

  if (maybeZrxQuoteResponse.isErr()) return Err(maybeZrxQuoteResponse.unwrapErr())
  const zrxQuoteResponse = maybeZrxQuoteResponse.unwrap()

  const { sellAmount, buyAmount, fees, permit2, transaction, route } = zrxQuoteResponse

  const permit2Eip712 = permit2?.eip712

  const isWrappedNative = route.fills.some(
    fill => fill.source === 'Wrapped_Native' && fill.proportionBps === '10000',
  )

  if (!isNativeEvmAsset(sellAsset.assetId) && !isWrappedNative && !permit2Eip712) {
    return Err(
      makeSwapErrorRight({
        message: 'Missing required Permit2 metadata from 0x response',
        code: TradeQuoteError.InvalidResponse,
        details: { transaction, permit2Eip712 },
      }),
    )
  }

  if (!transaction) {
    return Err(
      makeSwapErrorRight({
        message: 'Missing required transaction metadata from 0x response',
        code: TradeQuoteError.InvalidResponse,
        details: { transaction, permit2Eip712 },
      }),
    )
  }

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  const buyAmountBeforeFeesCryptoBaseUnit = calculateBuyAmountBeforeFeesCryptoBaseUnit({
    buyAmount,
    fees,
    buyAsset,
    sellAsset,
  })

  try {
    const { transactionData, networkFeeCryptoBaseUnit } = await getZrxStepData({
      adapter: assertGetEvmChainAdapter(chainId),
      chainId: sellAsset.chainId,
      transaction,
      permit2Eip712,
      from: receiveAddress,
      supportsEIP1559: Boolean(supportsEIP1559),
    })

    return Ok({
      id: uuid(),
      quoteOrRate: 'quote' as const,
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
          transactionData,
        },
      ] as SingleHopTradeQuoteSteps,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: 'failed to get fee data',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}
