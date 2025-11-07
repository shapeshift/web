import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import { PERMIT2_CONTRACT } from '@shapeshiftoss/contracts'
import type { AssetsByIdPartial } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { TypedData } from 'eip-712'
import { v4 as uuid } from 'uuid'
import type { Address } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  GetEvmTradeQuoteInputBase,
  SingleHopTradeQuoteSteps,
  SwapErrorRight,
  TradeQuote,
  TradeQuoteStep,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { fetchZrxQuote } from '../utils/fetchFromZrx'
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

  const transactionMetadata: TradeQuoteStep['zrxTransactionMetadata'] = {
    to: transaction.to,
    data: transaction.data as Address,
    gasPrice: transaction.gasPrice || undefined,
    gas: transaction.gas || undefined,
    value: transaction.value,
  }

  const rate = calculateRate({ buyAmount, sellAmount, buyAsset, sellAsset })

  const buyAmountBeforeFeesCryptoBaseUnit = calculateBuyAmountBeforeFeesCryptoBaseUnit({
    buyAmount,
    fees,
    buyAsset,
    sellAsset,
  })

  try {
    const adapter = assertGetEvmChainAdapter(chainId)
    const { average } = await adapter.getGasFeeData()

    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559: Boolean(supportsEIP1559),
      // add gas limit buffer to account for the fact we perform all of our validation on the trade quote estimations
      // which are inaccurate and not what we use for the tx to broadcast
      gasLimit: bnOrZero(transaction.gas).times(1.2).toFixed(),
    })

    const zrxQuote = {
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
          permit2Eip712: permit2Eip712 as unknown as TypedData | undefined,
          zrxTransactionMetadata: transactionMetadata,
        },
      ] as SingleHopTradeQuoteSteps,
    }

    console.log('[Zrx Debug] Generated trade quote:', {
      quoteOrRate: zrxQuote.quoteOrRate,
      receiveAddress: zrxQuote.receiveAddress,
      swapperName: zrxQuote.swapperName,
    })

    return Ok(zrxQuote)
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
