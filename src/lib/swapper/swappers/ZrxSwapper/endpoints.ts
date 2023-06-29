import type { ChainAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { ETHSignTx } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Tx } from '@shapeshiftoss/unchained-client/src/evm'
import type { Result } from '@sniptt/monads/build'
import axios from 'axios'
import { getConfig } from 'config'
import { v4 as uuid } from 'uuid'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote2,
} from 'lib/swapper/api'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { assertUnreachable, isEvmChainAdapter } from 'lib/utils'

import { getZrxTradeQuote } from './getZrxTradeQuote/getZrxTradeQuote'
import { fetchZrxQuote } from './utils/fetchZrxQuote'

const createDefaultStatusResponse = (buyTxId: string) => ({
  status: TxStatus.Unknown,
  buyTxId,
  message: undefined,
})

const tradeQuoteMetadata: Map<string, { chainId: EvmChainId }> = new Map()

const getUnchainedBaseUrl = (chainId: EvmChainId) => {
  const {
    REACT_APP_UNCHAINED_AVALANCHE_HTTP_URL,
    REACT_APP_UNCHAINED_BNBSMARTCHAIN_HTTP_URL,
    REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
    REACT_APP_UNCHAINED_GNOSIS_HTTP_URL,
    REACT_APP_UNCHAINED_OPTIMISM_HTTP_URL,
    REACT_APP_UNCHAINED_POLYGON_HTTP_URL,
  } = getConfig()

  switch (chainId) {
    case KnownChainIds.AvalancheMainnet:
      return REACT_APP_UNCHAINED_AVALANCHE_HTTP_URL
    case KnownChainIds.BnbSmartChainMainnet:
      return REACT_APP_UNCHAINED_BNBSMARTCHAIN_HTTP_URL
    case KnownChainIds.EthereumMainnet:
      return REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL
    case KnownChainIds.GnosisMainnet:
      return REACT_APP_UNCHAINED_GNOSIS_HTTP_URL
    case KnownChainIds.OptimismMainnet:
      return REACT_APP_UNCHAINED_OPTIMISM_HTTP_URL
    case KnownChainIds.PolygonMainnet:
      return REACT_APP_UNCHAINED_POLYGON_HTTP_URL
    default:
      assertUnreachable(chainId)
  }
}

export const zrxApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
    { sellAssetUsdRate }: { sellAssetUsdRate: string },
  ): Promise<Result<TradeQuote2, SwapErrorRight>> => {
    const tradeQuoteResult = await getZrxTradeQuote(
      input as GetEvmTradeQuoteInput,
      sellAssetUsdRate,
    )

    return tradeQuoteResult.map(tradeQuote => {
      const { receiveAddress, affiliateBps } = input
      const id = uuid()
      tradeQuoteMetadata.set(id, { chainId: tradeQuote.steps[0].sellAsset.chainId as EvmChainId })
      return { id, receiveAddress, affiliateBps, ...tradeQuote }
    })
  },

  getUnsignedTx: async ({ from, tradeQuote, stepIndex }: GetUnsignedTxArgs): Promise<ETHSignTx> => {
    const { accountNumber, buyAsset, sellAsset, sellAmountBeforeFeesCryptoBaseUnit } =
      tradeQuote.steps[stepIndex]

    const { receiveAddress, recommendedSlippage, affiliateBps } = tradeQuote

    const chainId = sellAsset.chainId
    const adapterManager = getChainAdapterManager()
    const adapter = adapterManager.get(chainId) as ChainAdapter<EvmChainId>

    if (adapter === undefined) {
      throw new SwapError('[executeTrade] - getChainAdapterManager returned undefined', {
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { chainId },
      })
    }

    if (!isEvmChainAdapter(adapter)) {
      throw new SwapError('[executeTrade] - non-EVM chain adapter detected', {
        code: SwapErrorType.EXECUTE_TRADE_FAILED,
        details: {
          chainAdapterName: adapter.getDisplayName(),
          chainId: adapter.getChainId(),
        },
      })
    }

    const maybeZrxQuote = await fetchZrxQuote({
      buyAsset,
      sellAsset,
      receiveAddress,
      slippage: recommendedSlippage, // TODO: use the slippage from user input
      affiliateBps,
      sellAmountBeforeFeesCryptoBaseUnit,
    })

    if (maybeZrxQuote.isErr()) throw maybeZrxQuote.unwrapErr()
    const { data: zrxQuote } = maybeZrxQuote.unwrap()

    const { value, to, gasPrice, gas, data } = zrxQuote

    const buildSendApiTxInput = {
      value: value.toString(),
      to,
      from: from!,
      chainSpecific: {
        gasPrice: gasPrice.toString(),
        gasLimit: gas.toString(),
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        data: data.toString(),
      },
      accountNumber,
    }
    return adapter.buildSendApiTransaction(buildSendApiTxInput)
  },

  checkTradeStatus: async ({
    tradeId,
    txId,
  }): Promise<{ status: TxStatus; buyTxId: string | undefined; message: string | undefined }> => {
    try {
      const maybeTradeQuoteMetadata = tradeQuoteMetadata.get(tradeId)
      if (!maybeTradeQuoteMetadata) {
        console.log('missing trade quote metadata')
        console.log(tradeId)
        console.log(maybeTradeQuoteMetadata)
        return createDefaultStatusResponse(txId)
      }
      const baseUrl = getUnchainedBaseUrl(maybeTradeQuoteMetadata.chainId)
      const {
        data: { status: rawStatus },
      } = await axios.get<Tx>(`${baseUrl}/api/v1/tx/${txId}`)

      // TODO: write a helper to map all 256 statuses to a status enum + message
      // https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1066.md#implementation
      const status = (() => {
        switch (rawStatus) {
          case 0:
            return TxStatus.Failed
          case 1:
            return TxStatus.Confirmed
          default:
            return TxStatus.Pending
        }
      })()

      return {
        status,
        buyTxId: txId,
        message: undefined,
      }
    } catch (e) {
      console.error(e)
      return createDefaultStatusResponse(txId)
    }
  },
}
