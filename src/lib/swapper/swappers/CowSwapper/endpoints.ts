import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type {
  CowSwapOrder,
  EvmMessageToSign,
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedEvmMessageArgs,
  SwapErrorRight,
  SwapperApi,
  TradeQuote,
} from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { getConfig } from 'config'
import { v4 as uuid } from 'uuid'
import { createDefaultStatusResponse } from 'lib/utils/evm'

import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { getCowSwapTradeQuote } from './getCowSwapTradeQuote/getCowSwapTradeQuote'
import type {
  CowSwapGetTradesResponse,
  CowSwapGetTransactionsResponse,
  CowSwapQuoteResponse,
} from './types'
import {
  COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  ERC20_TOKEN_BALANCE,
  ORDER_KIND_SELL,
} from './utils/constants'
import { cowService } from './utils/cowService'
import {
  getCowswapNetwork,
  getFullAppData,
  getNowPlusThirtyMinutesTimestamp,
} from './utils/helpers/helpers'

const tradeQuoteMetadata: Map<string, { chainId: EvmChainId }> = new Map()

export const cowApi: SwapperApi = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getCowSwapTradeQuote(input as GetEvmTradeQuoteInput)

    return tradeQuoteResult.map(tradeQuote => {
      const id = uuid()
      tradeQuoteMetadata.set(id, { chainId: tradeQuote.steps[0].sellAsset.chainId as EvmChainId })
      return [tradeQuote]
    })
  },

  getUnsignedEvmMessage: async ({
    from,
    tradeQuote,
    stepIndex,
    chainId,
  }: GetUnsignedEvmMessageArgs): Promise<EvmMessageToSign> => {
    const { buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } =
      tradeQuote.steps[stepIndex]
    const { receiveAddress } = tradeQuote

    const buyTokenAddress = !isNativeEvmAsset(buyAsset.assetId)
      ? fromAssetId(buyAsset.assetId).assetReference
      : COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS

    const maybeNetwork = getCowswapNetwork(sellAsset.chainId)
    if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()

    const network = maybeNetwork.unwrap()
    const baseUrl = getConfig().REACT_APP_COWSWAP_BASE_URL

    const { appData, appDataHash } = await getFullAppData()
    // https://api.cow.fi/docs/#/default/post_api_v1_quote
    const maybeQuoteResponse = await cowService.post<CowSwapQuoteResponse>(
      `${baseUrl}/${network}/api/v1/quote/`,
      {
        sellToken: fromAssetId(sellAsset.assetId).assetReference,
        buyToken: buyTokenAddress,
        receiver: receiveAddress,
        validTo: getNowPlusThirtyMinutesTimestamp(),
        appData,
        appDataHash,
        partiallyFillable: false,
        from,
        kind: ORDER_KIND_SELL,
        sellAmountBeforeFee: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      },
    )

    if (maybeQuoteResponse.isErr()) throw maybeQuoteResponse.unwrapErr()

    const { data: cowSwapQuoteResponse } = maybeQuoteResponse.unwrap()

    const { id, quote } = cowSwapQuoteResponse
    const orderToSign: CowSwapOrder = {
      ...quote,
      // from,
      sellTokenBalance: ERC20_TOKEN_BALANCE,
      buyTokenBalance: ERC20_TOKEN_BALANCE,
      quoteId: id,
    }

    return { chainId, orderToSign }
  },

  checkTradeStatus: async ({
    txHash, // TODO: this is not a tx hash, its an ID
    chainId,
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | undefined
  }> => {
    const maybeNetwork = getCowswapNetwork(chainId)
    if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()
    const network = maybeNetwork.unwrap()

    const baseUrl = getConfig().REACT_APP_COWSWAP_BASE_URL

    // with cow we aren't able to get the tx hash until it's already completed, so we must use the
    // order uid to fetch the trades and use their existence as indicating "complete"
    // https://docs.cow.fi/tutorials/how-to-submit-orders-via-the-api/6.-checking-order-status
    const maybeTradesResponse = await cowService.get<CowSwapGetTradesResponse>(
      `${baseUrl}/${network}/api/v1/trades`,
      { params: { orderUid: txHash } },
    )

    if (maybeTradesResponse.isErr()) throw maybeTradesResponse.unwrapErr()
    const { data: trades } = maybeTradesResponse.unwrap()
    const buyTxHash = trades[0]?.txHash

    if (!buyTxHash) return createDefaultStatusResponse(undefined)

    const maybeGetOrdersResponse = await cowService.get<CowSwapGetTransactionsResponse>(
      `${baseUrl}/${network}/api/v1/transactions/${buyTxHash}/orders`,
    )

    if (maybeGetOrdersResponse.isErr()) throw maybeGetOrdersResponse.unwrapErr()

    const {
      data: [{ status: rawStatus }],
    } = maybeGetOrdersResponse.unwrap()

    // https://api.cow.fi/docs/#/default/get_api_v1_orders__UID_
    const status = (() => {
      switch (rawStatus) {
        case 'fulfilled':
          return TxStatus.Confirmed
        case 'presignaturePending':
        case 'open':
          return TxStatus.Pending
        case 'cancelled':
        case 'expired':
          return TxStatus.Failed
        default:
          return TxStatus.Unknown
      }
    })()

    return {
      status,
      buyTxHash,
      message: rawStatus,
    }
  },
}
