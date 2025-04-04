import { fromChainId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads/build'
import { Err } from '@sniptt/monads/build'
import type { InterpolationOptions } from 'node-polyglot'

import type {
  CommonTradeQuoteInput,
  EvmTransactionRequest,
  GetTradeRateInput,
  GetUnsignedEvmTransactionArgs,
  SwapErrorRight,
  SwapperApi,
  SwapperDeps,
  TradeQuote,
  TradeRate,
} from '../../types'
import { TradeQuoteError } from '../../types'
import { checkSafeTransactionStatus, isExecutableTradeQuote, makeSwapErrorRight } from '../../utils'
import { relayChainMap } from './constant'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'
import { relayService } from './utils/relayService'
import type { RelayStatus } from './utils/types'

export const relayApi: SwapperApi = {
  getTradeQuote: async (
    input: CommonTradeQuoteInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    if (input.sellAmountIncludingProtocolFeesCryptoBaseUnit === '0') {
      return Err(
        makeSwapErrorRight({
          message: 'sell amount too low',
          code: TradeQuoteError.SellAmountBelowMinimum,
        }),
      )
    }

    const tradeQuoteResult = await getTradeQuote(input, deps, relayChainMap)

    return tradeQuoteResult
  },
  getTradeRate: async (
    input: GetTradeRateInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeRate[], SwapErrorRight>> => {
    if (input.sellAmountIncludingProtocolFeesCryptoBaseUnit === '0') {
      return Err(
        makeSwapErrorRight({
          message: 'sell amount too low',
          code: TradeQuoteError.SellAmountBelowMinimum,
        }),
      )
    }

    const tradeRateResult = await getTradeRate(input, deps, relayChainMap)

    return tradeRateResult
  },
  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    stepIndex,
    tradeQuote,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')
    const currentStep = tradeQuote.steps[stepIndex]
    if (!currentStep?.relayTransactionMetadata) throw Error('Invalid step index')

    const { to, value, data, gas, maxFeePerGas, maxPriorityFeePerGas } =
      currentStep.relayTransactionMetadata

    if (to === undefined || value === undefined || data === undefined || gas === undefined) {
      const undefinedRequiredValues = [to, value, data, gas].filter(value => value === undefined)

      throw Error('undefined required values in swap step', {
        cause: {
          undefinedRequiredValues,
        },
      })
    }

    const feeData = await (async () => {
      if (bnOrZero(maxFeePerGas).isZero() || bnOrZero(maxPriorityFeePerGas).isZero()) {
        const { average } = await assertGetEvmChainAdapter(
          currentStep.sellAsset.chainId,
        ).getGasFeeData()

        return {
          maxFeePerGas: undefined,
          maxPriorityFeePerGas: undefined,
          gasPrice: average.gasPrice,
        }
      }

      return {
        maxFeePerGas,
        maxPriorityFeePerGas,
      }
    })()

    return {
      to,
      from,
      value,
      data,
      chainId: Number(fromChainId(chainId).chainReference),
      ...feeData,
      gasLimit: gas,
    }
  },
  checkTradeStatus: async ({
    quoteId,
    txHash,
    chainId,
    accountId,
    config,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }> => {
    const maybeSafeTransactionStatus = await checkSafeTransactionStatus({
      txHash,
      chainId,
      assertGetEvmChainAdapter,
      accountId,
      fetchIsSmartContractAddressQuery,
    })

    if (maybeSafeTransactionStatus) {
      // return any safe transaction status that has not yet executed on chain (no buyTxHash)
      if (!maybeSafeTransactionStatus.buyTxHash) return maybeSafeTransactionStatus

      // The safe buyTxHash is the on chain transaction hash (not the safe transaction hash).
      // Mutate txHash and continue with regular status check flow.
      txHash = maybeSafeTransactionStatus.buyTxHash
    }

    const maybeStatusResponse = await relayService.get<RelayStatus>(
      `${config.VITE_RELAY_API_URL}/intents/status/v2?requestId=${quoteId}`,
    )

    if (maybeStatusResponse.isErr()) {
      return {
        buyTxHash: undefined,
        status: TxStatus.Unknown,
        message: undefined,
      }
    }

    const { data: statusResponse } = maybeStatusResponse.unwrap()

    const status = (() => {
      switch (statusResponse.status) {
        case 'success':
          return TxStatus.Confirmed
        case 'pending':
          return TxStatus.Pending
        case 'failed':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    return {
      status,
      buyTxHash: statusResponse.txHashes?.[0],
      message: undefined,
    }
  },
}
