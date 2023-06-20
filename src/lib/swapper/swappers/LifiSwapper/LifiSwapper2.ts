import type { ChainKey, GetStatusRequest, Route } from '@lifi/sdk/dist/types'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads/build'
import { Err } from '@sniptt/monads/build'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import type {
  BuyAssetBySellIdInput,
  ExecuteTradeArgs,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2,
  TradeQuote2,
} from 'lib/swapper/api'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'

import { filterEvmAssetIdsBySellable } from '../utils/filterAssetIdsBySellable/filterAssetIdsBySellable'
import { filterCrossChainEvmBuyAssetsBySellAssetId } from '../utils/filterBuyAssetsBySellAssetId/filterBuyAssetsBySellAssetId'
import { getTradeQuote } from './getTradeQuote/getTradeQuote'
import { getLifiChainMap } from './utils/getLifiChainMap'
import { getUnsignedTx } from './utils/getUnsignedTx/getUnsignedTx'

const executedTrades: Map<string, GetStatusRequest> = new Map()
const tradeQuoteMetadata: Map<string, Route> = new Map()

let lifiChainMapPromise: Promise<Result<Map<ChainId, ChainKey>, SwapErrorRight>> | undefined

export const lifi: Swapper2 = {
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
      from,
    })

    // cast required because hdwallet typings return ETHSignTx which doesn't explicitly extends SignTx<C>
    return unsignedTx
  },

  executeTrade: async ({ txToExecute, wallet, chainId }: ExecuteTradeArgs) => {
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(chainId) as unknown as ChainAdapter<EvmChainId>

    if (wallet.supportsOfflineSigning()) {
      const signedTx = await adapter.signTransaction({
        txToSign: txToExecute as ETHSignTx,
        wallet,
      })

      const txid = await adapter.broadcastTransaction(signedTx)

      return txid
    }

    if (wallet.supportsBroadcast() && adapter.signAndBroadcastTransaction) {
      const txid = await adapter.signAndBroadcastTransaction?.({
        txToSign: txToExecute as ETHSignTx,
        wallet,
      })

      return txid
    }

    throw Error('sign and broadcast failed')
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
