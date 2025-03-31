import type { Execute } from '@reservoir0x/relay-sdk'
import { fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads/build'
import { Err } from '@sniptt/monads/build'
import type { InterpolationOptions } from 'node-polyglot'

import type {
  CommonTradeQuoteInput,
  EvmTransactionRequest,
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
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

// cached metadata - would need persistent cache with expiry if moved server-side
const tradeQuoteMetadata: Map<string, Execute> = new Map()

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

    const tradeQuoteResult = await getTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      deps,
      relayChainMap,
    )

    return tradeQuoteResult.map(quote =>
      quote.map(tradeQuote => {
        if (!tradeQuote.selectedRelayRoute) throw Error('missing selectedRelayRoute')

        tradeQuoteMetadata.set(tradeQuote.id, tradeQuote.selectedRelayRoute)

        return tradeQuote
      }),
    )
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

    const tradeRateResult = await getTradeRate(input as GetEvmTradeRateInput, deps, relayChainMap)

    return tradeRateResult
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

    const relayQuote = tradeQuoteMetadata.get(tradeQuote.id)

    if (!relayQuote) throw Error(`missing trade quote metadata for quoteId ${tradeQuote.id}`)

    const swapSteps = relayQuote.steps.filter(step => step.id !== 'approve')

    const { to, value, data, gas } = swapSteps[stepIndex].items?.[0].data ?? {}

    const feeData = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data,
      to,
      // This looks odd but we need this, else unchained estimate calls will fail with:
      // "invalid decimal value (argument=\"value\", value=\"0x0\", code=INVALID_ARGUMENT, version=bignumber/5.7.0)"
      value: bnOrZero(value.toString()).toString(),
      from,
      supportsEIP1559,
    })

    return {
      to,
      from,
      value: value.toString(),
      data,
      chainId: Number(fromChainId(chainId).chainReference),
      ...{ ...feeData, gasLimit: gas },
    }
  },
  getEvmTransactionFees: async ({
    chainId,
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<string> => {
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const relayQuote = tradeQuoteMetadata.get(tradeQuote.id)

    if (!relayQuote) throw Error(`missing trade quote metadata for quoteId ${tradeQuote.id}`)

    const swapSteps = relayQuote.steps.filter(step => step.id !== 'approve')
    const { to, value, data } = swapSteps[stepIndex].items?.[0].data ?? {}

    const { networkFeeCryptoBaseUnit } = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data: data.toString(),
      to,
      // This looks odd but we need this, else unchained estimate calls will fail with:
      // "invalid decimal value (argument=\"value\", value=\"0x0\", code=INVALID_ARGUMENT, version=bignumber/5.7.0)"
      value: bnOrZero(value.toString()).toString(),
      from,
      supportsEIP1559,
    })

    return networkFeeCryptoBaseUnit
  },

  checkTradeStatus: async ({
    quoteId,
    txHash,
    stepIndex,
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

    const relayQuote = tradeQuoteMetadata.get(quoteId)

    if (!relayQuote) throw Error(`missing trade quote metadata for quoteId ${quoteId}`)

    const swapSteps = relayQuote.steps.filter(step => step.id !== 'approve')

    const requestId = swapSteps[stepIndex].requestId

    const maybeStatusResponse = await relayService.get<RelayStatus>(
      `${config.VITE_RELAY_API_URL}intents/status/v2?requestId=${requestId}`,
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
      // We have an out Tx hash (either same or cross-chain) for this step, so we consider the Tx (effectively, the step) confirmed
      status,
      buyTxHash: statusResponse.txHashes?.[0],
      message: undefined,
    }
  },
}
