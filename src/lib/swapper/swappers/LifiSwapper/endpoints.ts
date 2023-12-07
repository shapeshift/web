import type { ExtendedTransactionInfo } from '@lifi/sdk'
import type { ChainKey, GetStatusRequest, Route } from '@lifi/sdk/dist/types'
import { type ChainId, fromChainId } from '@shapeshiftoss/caip'
import type { SwapErrorRight } from '@shapeshiftoss/swapper'
import { makeSwapErrorRight, SwapErrorType } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { Err } from '@sniptt/monads/build'
import type {
  EvmTransactionRequest,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedEvmTransactionArgs,
  SwapperApi,
  TradeQuote,
} from 'lib/swapper/types'
import { createDefaultStatusResponse } from 'lib/utils/evm'
import type { AssetsById } from 'state/slices/assetsSlice/assetsSlice'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getLifi } from './utils/getLifi'
import { getLifiChainMap } from './utils/getLifiChainMap'

const tradeQuoteMetadata: Map<string, Route> = new Map()

// cached metadata - would need persistent cache with expiry if moved server-side
let lifiChainMapPromise: Promise<Map<ChainId, ChainKey>> | undefined

export const lifiApi: SwapperApi = {
  // TODO: this isn't a pure swapper method, see https://github.com/shapeshift/web/pull/5519
  // We currently need to pass assetsById to avoid instantiating AssetService in web
  // but will need to remove this second arg once this lives outside of web, to keep things pure and swappery
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    assetsById: AssetsById,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    if (input.sellAmountIncludingProtocolFeesCryptoBaseUnit === '0') {
      return Err(
        makeSwapErrorRight({
          message: 'sell amount too low',
          code: SwapErrorType.TRADE_QUOTE_AMOUNT_TOO_SMALL,
        }),
      )
    }

    if (lifiChainMapPromise === undefined) lifiChainMapPromise = getLifiChainMap()

    const lifiChainMap = await lifiChainMapPromise

    const tradeQuoteResult = await getTradeQuote(
      input as GetEvmTradeQuoteInput,
      lifiChainMap,
      assetsById,
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

  getUnsignedEvmTransaction: async ({
    chainId,
    from,
    stepIndex,
    tradeQuote,
    supportsEIP1559,
  }: GetUnsignedEvmTransactionArgs): Promise<EvmTransactionRequest> => {
    const lifiRoute = tradeQuoteMetadata.get(tradeQuote.id)

    if (!lifiRoute) throw Error(`missing trade quote metadata for quoteId ${tradeQuote.id}`)

    const lifiStep = lifiRoute.steps[stepIndex]

    const lifi = getLifi()
    const { transactionRequest } = await lifi.getStepTransaction(lifiStep)

    if (!transactionRequest) {
      throw Error('undefined transactionRequest')
    }

    const { gasLimit, gasPrice, to, value, data, maxFeePerGas, maxPriorityFeePerGas } =
      transactionRequest

    // checking values individually to keep type checker happy
    if (
      to === undefined ||
      value === undefined ||
      data === undefined ||
      gasLimit === undefined ||
      gasPrice === undefined
    ) {
      const undefinedRequiredValues = [to, value, data, gasLimit, gasPrice].filter(
        value => value === undefined,
      )

      throw Error('undefined required values in transactionRequest', {
        cause: {
          undefinedRequiredValues,
        },
      })
    }

    return {
      to,
      from,
      value: value.toString(),
      data: data.toString(),
      chainId: Number(fromChainId(chainId).chainReference),
      gasLimit: gasLimit.toString(),
      ...(supportsEIP1559 && maxFeePerGas && maxPriorityFeePerGas
        ? {
            maxFeePerGas: maxFeePerGas.toString(),
            maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
          }
        : { gasPrice: gasPrice.toString() }),
    }
  },

  checkTradeStatus: async ({
    quoteId,
    txHash,
  }): Promise<{ status: TxStatus; buyTxHash: string | undefined; message: string | undefined }> => {
    const lifiRoute = tradeQuoteMetadata.get(quoteId)
    if (!lifiRoute) throw Error(`missing trade quote metadata for quoteId ${quoteId}`)

    // getMixPanel()?.track(MixPanelEvents.SwapperApiRequest, {
    //   swapper: SwapperName.LIFI,
    //   method: 'get',
    //   // Note, this may change if the Li.Fi SDK changes
    //   url: 'https://li.quest/v1/status',
    // })

    // don't use lifi sdk here because all status responses are cached, negating the usefulness of polling
    // i.e don't do `await getLifi().getStatus(getStatusRequest)`
    const url = new URL('https://li.quest/v1/status')
    const getStatusRequestParams: { [Key in keyof GetStatusRequest]: string } = {
      txHash,
      bridge: lifiRoute.steps[0].tool,
      fromChain: lifiRoute.fromChainId.toString(),
      toChain: lifiRoute.toChainId.toString(),
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
