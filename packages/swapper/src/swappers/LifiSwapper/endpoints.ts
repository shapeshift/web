import type { ChainKey, ExtendedTransactionInfo, GetStatusRequest, Route } from '@lifi/sdk'
import { getStepTransaction } from '@lifi/sdk'
import { type ChainId, fromChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bn } from '@shapeshiftoss/utils'
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
  SwapperDeps,
  TradeRate,
} from '../../types'
import { type SwapErrorRight, type SwapperApi, type TradeQuote, TradeQuoteError } from '../../types'
import {
  checkSafeTransactionStatus,
  createDefaultStatusResponse,
  isExecutableTradeQuote,
  makeSwapErrorRight,
} from '../../utils'
import { getTradeQuote, getTradeRate } from './getTradeQuote/getTradeQuote'
import { configureLiFi } from './utils/configureLiFi'
import { getLifiChainMap } from './utils/getLifiChainMap'

const tradeQuoteMetadata: Map<string, Route> = new Map()

// cached metadata - would need persistent cache with expiry if moved server-side
let lifiChainMapPromise: Promise<Map<ChainId, ChainKey>> | undefined

export const lifiApi: SwapperApi = {
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

    if (lifiChainMapPromise === undefined) lifiChainMapPromise = getLifiChainMap()

    const lifiChainMap = await lifiChainMapPromise

    const tradeQuoteResult = await getTradeQuote(
      input as GetEvmTradeQuoteInputBase,
      deps,
      lifiChainMap,
    )

    return tradeQuoteResult.map(quote =>
      quote.map(({ selectedLifiRoute, ...tradeQuote }) => {
        // TODO: quotes below the minimum aren't valid and should not be processed as such
        // selectedLifiRoute will be missing for quotes below the minimum
        if (!selectedLifiRoute) throw Error('missing selectedLifiRoute')

        const id = selectedLifiRoute.id

        // store the lifi quote metadata for transaction building later
        tradeQuoteMetadata.set(id, selectedLifiRoute)

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

    if (lifiChainMapPromise === undefined) lifiChainMapPromise = getLifiChainMap()

    const lifiChainMap = await lifiChainMapPromise

    const tradeRateResult = await getTradeRate(input as GetEvmTradeRateInput, deps, lifiChainMap)

    return tradeRateResult.map(quote =>
      quote.map(({ selectedLifiRoute, ...tradeQuote }) => {
        // TODO: quotes below the minimum aren't valid and should not be processed as such
        // selectedLifiRoute will be missing for quotes below the minimum
        if (!selectedLifiRoute) throw Error('missing selectedLifiRoute')

        const id = selectedLifiRoute.id

        // store the lifi quote metadata for transaction building later
        tradeQuoteMetadata.set(id, selectedLifiRoute)

        return tradeQuote
      }),
    )
  },
  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
    assertGetEvmChainAdapter,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    configureLiFi()
    if (!isExecutableTradeQuote(tradeQuote)) throw Error('Unable to execute trade')

    const lifiRoute = tradeQuoteMetadata.get(tradeQuote.id)

    if (!lifiRoute) throw Error(`missing trade quote metadata for quoteId ${tradeQuote.id}`)

    const lifiStep = lifiRoute.steps[stepIndex]

    const { transactionRequest } = await getStepTransaction(lifiStep)

    if (!transactionRequest) {
      throw Error('undefined transactionRequest')
    }

    const { to, value, data, gasLimit } = transactionRequest

    // checking values individually to keep type checker happy
    if (to === undefined || value === undefined || data === undefined || gasLimit === undefined) {
      const undefinedRequiredValues = [to, value, data, gasLimit].filter(
        value => value === undefined,
      )

      throw Error('undefined required values in transactionRequest', {
        cause: {
          undefinedRequiredValues,
        },
      })
    }

    const feeData = await evm.getFees({
      adapter: assertGetEvmChainAdapter(chainId),
      data: data.toString(),
      to,
      value: bn(value.toString()).toString(),
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
    const lifiRoute = tradeQuoteMetadata.get(quoteId)
    if (!lifiRoute) throw Error(`missing trade quote metadata for quoteId ${quoteId}`)

    // getMixPanel()?.track(MixPanelEvent.SwapperApiRequest, {
    //   swapper: SwapperName.LIFI,
    //   method: 'get',
    //   // Note, this may change if the Li.Fi SDK changes
    //   url: 'https://li.quest/v1/status',
    // })

    const {
      action: { fromChainId, toChainId },
      tool,
    } = lifiRoute.steps[stepIndex]

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

    // don't use lifi sdk here because all status responses are cached, negating the usefulness of polling
    // i.e don't do `await getLifi().getStatus(getStatusRequest)`
    const url = new URL('https://li.quest/v1/status')
    const getStatusRequestParams: { [Key in keyof GetStatusRequest]: string } = {
      txHash,
      bridge: tool,
      fromChain: fromChainId.toString(),
      toChain: toChainId.toString(),
    }
    url.search = new URLSearchParams(getStatusRequestParams).toString()
    const response = await fetch(url, { cache: 'no-store' }) // don't cache!

    if (!response.ok) return createDefaultStatusResponse()

    const statusResponse = await response.json()

    const status = (() => {
      switch (statusResponse.status) {
        case 'DONE':
          return TxStatus.Confirmed
        case 'PENDING':
          return TxStatus.Pending
        case 'FAILED':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    return {
      status,
      buyTxHash: (statusResponse.receiving as ExtendedTransactionInfo)?.txHash,
      message: statusResponse.substatusMessage,
    }
  },
}
