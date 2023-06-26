import type { ChainKey, GetStatusRequest, Route } from '@lifi/sdk/dist/types'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import type { Asset } from 'lib/asset-service'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote2,
} from 'lib/swapper/api'
import { getTradeQuote } from 'lib/swapper/swappers/LifiSwapper/getTradeQuote/getTradeQuote'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
import { getLifiChainMap } from 'lib/swapper/swappers/LifiSwapper/utils/getLifiChainMap'
import { getUnsignedTx } from 'lib/swapper/swappers/LifiSwapper/utils/getUnsignedTx/getUnsignedTx'

let lifiChainMapPromise: Promise<Result<Map<ChainId, ChainKey>, SwapErrorRight>> | undefined
const tradeQuoteMetadata: Map<string, Route> = new Map()
const executedTrades: Map<string, GetStatusRequest> = new Map()

export const lifiApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    assets: Partial<Record<AssetId, Asset>>,
    sellAssetPriceUsdPrecision: string,
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    if (lifiChainMapPromise === undefined) lifiChainMapPromise = getLifiChainMap()

    const maybeLifiChainMap = await lifiChainMapPromise

    if (maybeLifiChainMap.isErr()) return Err(maybeLifiChainMap.unwrapErr())

    const tradeQuoteResult = await getTradeQuote(
      input as GetEvmTradeQuoteInput,
      maybeLifiChainMap.unwrap(),
      assets,
      sellAssetPriceUsdPrecision,
    )

    return tradeQuoteResult.map(({ selectedLifiRoute, ...tradeQuote }) => {
      const { receiveAddress, affiliateBps } = input

      // TODO: quotes below the minimum arent valid and should not be processed as such
      // selectedLifiRoute willbe missing for quotes below the minimum
      if (!selectedLifiRoute) throw Error('missing selectedLifiRoute')

      const id = selectedLifiRoute.id

      // store the lifi quote metadata for transaction building later
      tradeQuoteMetadata.set(id, selectedLifiRoute)

      return { id, receiveAddress, affiliateBps, ...tradeQuote }
    })
  },
  getUnsignedTx: async ({ from, tradeQuote, stepIndex }: GetUnsignedTxArgs): Promise<ETHSignTx> => {
    const lifiRoute = tradeQuoteMetadata.get(tradeQuote.id)

    if (!lifiRoute) throw Error('missing trade quote metadata')

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

  checkTradeStatus: async (txId: string): Promise<{ isComplete: boolean; message?: string }> => {
    const getStatusRequest = executedTrades.get(txId)
    if (getStatusRequest === undefined) throw Error(`missing getStatusRequest for txId ${txId}`)
    const statusResponse = await getLifi().getStatus(getStatusRequest)

    return {
      isComplete: statusResponse.status === 'DONE',
      message: statusResponse.substatusMessage,
    }
  },
}
