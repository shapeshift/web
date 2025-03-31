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
import { isExecutableTradeQuote, makeSwapErrorRight } from '../../utils'
import { relayChainMap } from './constant'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getTradeRate } from './getTradeRate/getTradeRate'

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

    const currentStep = relayQuote.steps[stepIndex]

    const { to, value, data, gasLimit } = currentStep.items?.[0].data ?? {}

    const feeData = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data: currentStep?.toString(),
      to: '',
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
      data: data.toString(),
      chainId: Number(fromChainId(chainId).chainReference),
      ...{ ...feeData, gasLimit: gasLimit.toString() },
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

    const currentStep = relayQuote.steps[stepIndex]

    console.log({ currentStep })

    const { to, value, data } = currentStep.items?.[0].data ?? {}

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
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }> => {
    await (async () => {
      await console.log({
        quoteId,
        txHash,
        stepIndex,
        chainId,
        accountId,
        fetchIsSmartContractAddressQuery,
        assertGetEvmChainAdapter,
      })
    })()
    return {
      // We have an out Tx hash (either same or cross-chain) for this step, so we consider the Tx (effectively, the step) confirmed
      status: TxStatus.Pending,
      buyTxHash: undefined,
      message: undefined,
    }
  },
}
