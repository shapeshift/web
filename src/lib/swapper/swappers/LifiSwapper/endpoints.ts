import type { ExtendedTransactionInfo } from '@lifi/sdk'
import type { ChainKey, GetStatusRequest, Route } from '@lifi/sdk/dist/types'
import type { ChainId } from '@shapeshiftoss/caip'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { Err } from '@sniptt/monads/build'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote2,
} from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import type { TradeQuoteDeps } from 'lib/swapper/types'
import { createDefaultStatusResponse } from 'lib/utils/evm'

import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getLifiChainMap } from './utils/getLifiChainMap'
import { getUnsignedTx } from './utils/getUnsignedTx/getUnsignedTx'

const tradeQuoteMetadata: Map<string, Route> = new Map()

let lifiChainMapPromise: Promise<Result<Map<ChainId, ChainKey>, SwapErrorRight>> | undefined

export const lifiApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    { assets }: TradeQuoteDeps,
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    if (input.sellAmountIncludingProtocolFeesCryptoBaseUnit === '0') {
      return Err(
        makeSwapErrorRight({
          message: 'sell amount too low',
          code: SwapErrorType.TRADE_QUOTE_AMOUNT_TOO_SMALL,
        }),
      )
    }
    if (lifiChainMapPromise === undefined) lifiChainMapPromise = getLifiChainMap()

    const maybeLifiChainMap = await lifiChainMapPromise

    if (maybeLifiChainMap.isErr()) return Err(maybeLifiChainMap.unwrapErr())

    const tradeQuoteResult = await getTradeQuote(
      input as GetEvmTradeQuoteInput,
      maybeLifiChainMap.unwrap(),
      assets,
    )
    const { receiveAddress } = input

    return tradeQuoteResult.map(({ selectedLifiRoute, ...tradeQuote }) => {
      // TODO: quotes below the minimum arent valid and should not be processed as such
      // selectedLifiRoute willbe missing for quotes below the minimum
      if (!selectedLifiRoute) throw Error('missing selectedLifiRoute')

      const id = selectedLifiRoute.id

      // store the lifi quote metadata for transaction building later
      tradeQuoteMetadata.set(id, selectedLifiRoute)

      return { id, receiveAddress, affiliateBps: undefined, ...tradeQuote }
    })
  },

  getUnsignedTx: async ({ from, tradeQuote, stepIndex }: GetUnsignedTxArgs): Promise<ETHSignTx> => {
    const lifiRoute = tradeQuoteMetadata.get(tradeQuote.id)
    if (!lifiRoute) throw Error(`missing trade quote metadata for quoteId ${tradeQuote.id}`)

    const { accountNumber, sellAsset } = tradeQuote.steps[stepIndex]

    const unsignedTx = await getUnsignedTx({
      lifiStep: lifiRoute.steps[stepIndex],
      accountNumber,
      sellAsset,
      // discriminated union between from or xpub in GetUnsignedTxArgs, but since Li.Fi only deals with EVMs, from is always going to be defined
      from: from!,
    })

    return unsignedTx
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
