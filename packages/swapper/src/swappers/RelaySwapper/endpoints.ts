import { TxStatus } from '@shapeshiftoss/unchained-client'
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

// const tradeQuoteMetadata: Map<string, Route> = new Map()

// cached metadata - would need persistent cache with expiry if moved server-side
// let lifiChainMapPromise: Promise<Map<ChainId, ChainKey>> | undefined

export const relayApi: SwapperApi = {
  getTradeQuote: async (
    input: CommonTradeQuoteInput,
    deps: SwapperDeps,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    console.log('relay api')
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

    await console.log({
      chainId,
      from,
      stepIndex,
      tradeQuote,
      supportsEIP1559,
      assertGetEvmChainAdapter,
    })

    // const feeData = await evm.getFees({
    //   adapter: assertGetEvmChainAdapter(chainId),
    //   data: data.toString(),
    //   to,
    //   // This looks odd but we need this, else unchained estimate calls will fail with:
    //   // "invalid decimal value (argument=\"value\", value=\"0x0\", code=INVALID_ARGUMENT, version=bignumber/5.7.0)"
    //   value: bn(value.toString()).toString(),
    //   from,
    //   supportsEIP1559,
    // })

    // return {
    //   to,
    //   from,
    //   value: value.toString(),
    //   data: data.toString(),
    //   chainId: Number(fromChainId(chainId).chainReference),
    //   ...{ ...feeData, gasLimit: gasLimit.toString() },
    // }

    return {} as EvmTransactionRequest
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

    await console.log({
      chainId,
      from,
      stepIndex,
      tradeQuote,
      supportsEIP1559,
      assertGetEvmChainAdapter,
    })

    // const lifiRoute = tradeQuoteMetadata.get(tradeQuote.id)

    // if (!lifiRoute) throw Error(`missing trade quote metadata for quoteId ${tradeQuote.id}`)

    // const lifiStep = lifiRoute.steps[stepIndex]

    // const { transactionRequest } = await getStepTransaction(lifiStep)

    // if (!transactionRequest) {
    //   throw Error('undefined transactionRequest')
    // }

    // const { to, value, data, gasLimit } = transactionRequest

    // // checking values individually to keep type checker happy
    // if (to === undefined || value === undefined || data === undefined || gasLimit === undefined) {
    //   const undefinedRequiredValues = [to, value, data, gasLimit].filter(
    //     value => value === undefined,
    //   )

    //   throw Error('undefined required values in transactionRequest', {
    //     cause: {
    //       undefinedRequiredValues,
    //     },
    //   })
    // }

    // const { networkFeeCryptoBaseUnit } = await evm.getFees({
    //   adapter: assertGetEvmChainAdapter(chainId),
    //   data: data.toString(),
    //   to,
    //   // This looks odd but we need this, else unchained estimate calls will fail with:
    //   // "invalid decimal value (argument=\"value\", value=\"0x0\", code=INVALID_ARGUMENT, version=bignumber/5.7.0)"
    //   value: bn(value.toString()).toString(),
    //   from,
    //   supportsEIP1559,
    // })

    return '0'
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
