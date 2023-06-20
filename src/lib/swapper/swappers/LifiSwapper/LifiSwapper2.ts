import type { ChainKey, GetStatusRequest } from '@lifi/sdk/dist/types'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads/build'
import { Err } from '@sniptt/monads/build'
import type { Asset } from 'lib/asset-service'
import type {
  BuyAssetBySellIdInput,
  GetEvmTradeQuoteInput,
  SwapErrorRight,
  Swapper2,
} from 'lib/swapper/api'
import { executeTrade } from 'lib/swapper/swappers/LifiSwapper/executeTrade/executeTrade'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterCrossChainEvmBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getLifiChainMap } from './utils/getLifiChainMap'
import type { LifiTradeQuote } from './utils/types'

const executedTrades: Map<string, GetStatusRequest> = new Map()
let lifiChainMapPromise: Promise<Result<Map<ChainId, ChainKey>, SwapErrorRight>> | undefined

export const lifi: Swapper2 = {
  getTradeQuote: async (
    input: GetEvmTradeQuoteInput,
    assets: Partial<Record<AssetId, Asset>>,
    sellAssetPriceUsdPrecision: string,
  ): Promise<Result<LifiTradeQuote<false>, SwapErrorRight>> => {
    if (lifiChainMapPromise === undefined) lifiChainMapPromise = getLifiChainMap()

    const maybeLifiChainMap = await lifiChainMapPromise

    if (maybeLifiChainMap.isErr()) return Err(maybeLifiChainMap.unwrapErr())

    return getTradeQuote(input, maybeLifiChainMap.unwrap(), assets, sellAssetPriceUsdPrecision)
  },

  executeTrade: async ({
    tradeQuote,
    wallet,
  }: {
    tradeQuote: LifiTradeQuote<false>
    wallet: HDWallet
  }): Promise<string> => {
    const { selectedLifiRoute } = tradeQuote
    const { accountNumber, sellAsset } = tradeQuote.steps[0]

    const executeTradeResult = await executeTrade({
      selectedLifiRoute,
      accountNumber,
      sellAsset,
      wallet,
    })

    if (executeTradeResult.isErr()) throw executeTradeResult.unwrapErr()

    const { tradeResult, getStatusRequest } = executeTradeResult.unwrap()

    executedTrades.set(tradeResult.tradeId, getStatusRequest)

    return tradeResult.tradeId
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

  filterAssetIdsBySellable: (assetIds: AssetId[]): AssetId[] => {
    return filterEvmAssetIdsBySellable(assetIds)
  },

  filterBuyAssetsBySellAssetId: (input: BuyAssetBySellIdInput): AssetId[] => {
    return filterCrossChainEvmBuyAssetsBySellAssetId(input)
  },
}
