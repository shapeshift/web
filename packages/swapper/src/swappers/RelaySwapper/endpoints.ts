import { fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import BigNumber from 'bignumber.js'
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
import { checkSafeTransactionStatus, isExecutableTradeQuote } from '../../utils'
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
    const tradeQuoteResult = await getTradeQuote(input, deps, relayChainMap)

    return tradeQuoteResult
  },
  getTradeRate: async (
    input: GetTradeRateInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeRate[], SwapErrorRight>> => {
    const tradeRateResult = await getTradeRate(input, deps, relayChainMap)

    return tradeRateResult
  },
  getEvmTransactionFees: ({
    stepIndex,
    tradeQuote,
  }: GetUnsignedEvmTransactionArgs): Promise<string> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const currentStep = tradeQuote.steps[stepIndex]
    if (!currentStep?.relayTransactionMetadata) throw Error('Invalid step index')

    const { gasAmountBaseUnit } = currentStep.relayTransactionMetadata

    if (!gasAmountBaseUnit) throw Error('Missing gas amount from relay quote')

    return Promise.resolve(gasAmountBaseUnit)
  },
  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')
    const currentStep = tradeQuote.steps[stepIndex]
    if (!currentStep?.relayTransactionMetadata) throw Error('Invalid step index')

    const { to, value, data, gasLimit: gasLimitFromApi } = currentStep.relayTransactionMetadata

    if (to === undefined || value === undefined || data === undefined) {
      const undefinedRequiredValues = [to, value, data].filter(value => value === undefined)

      throw Error('undefined required values in swap step', {
        cause: {
          undefinedRequiredValues,
        },
      })
    }

    const { gasLimit, ...feeData } = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data,
      to,
      value,
      from,
      supportsEIP1559,
    })

    return {
      to,
      from,
      value,
      data,
      chainId: Number(fromChainId(chainId).chainReference),
      ...feeData,
      gasLimit: BigNumber.max(gasLimitFromApi ?? '0', gasLimit).toFixed(),
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
