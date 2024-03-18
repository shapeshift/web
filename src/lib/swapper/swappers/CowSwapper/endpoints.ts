import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import {
  type CowSwapOrder,
  type EvmMessageToSign,
  type GetEvmTradeQuoteInput,
  type GetTradeQuoteInput,
  type GetUnsignedEvmMessageArgs,
  type SwapErrorRight,
  type SwapperApi,
  SwapperName,
  type TradeQuote,
} from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Result } from '@sniptt/monads/build'
import { getConfig } from 'config'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import { v4 as uuid } from 'uuid'
import { bn } from 'lib/bignumber/bignumber'
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
    const {
      receiveAddress,
      slippageTolerancePercentageDecimal = getDefaultSlippageDecimalPercentageForSwapper(
        SwapperName.CowSwap,
      ),
    } = tradeQuote

    const buyTokenAddress = !isNativeEvmAsset(buyAsset.assetId)
      ? fromAssetId(buyAsset.assetId).assetReference
      : COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS

    const maybeNetwork = getCowswapNetwork(sellAsset.chainId)
    if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()

    const network = maybeNetwork.unwrap()
    const baseUrl = getConfig().REACT_APP_COWSWAP_BASE_URL

    const { appData, appDataHash } = await getFullAppData(slippageTolerancePercentageDecimal)
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
    // Note: While CowSwap returns us a quote, and we have slippageBips in the appData, this isn't enough.
    // For the slippage actually to be enforced, the final message to be signed needs to have slippage deducted.
    // Failure to do so means orders may take forever to be filled, or never be filled at all.
    const quoteBuyAmount = quote.buyAmount
    const slippageDeductedBuyAmount = bn(quoteBuyAmount).minus(
      bn(quoteBuyAmount).times(slippageTolerancePercentageDecimal),
    )
    // CoW API and flow is weird - same idea as the mutation above, we need to incorporate protocol fees into the order
    // This was previously working as-is with fees being deducted from the sell amount at protocol-level, but we now we need to add them into the order
    // In other words, this means what was previously CoW being "feeless" as far as we're concerned
    // i.e no additional fees to account for when doing balance checks, no longer holds true
    //
    // This also makes CoW the first and currently *only* swapper where max token swaps aren't full balance
    const sellAmountPlusProtocolFees = bn(quote.sellAmount).plus(quote.feeAmount)
    const orderToSign: CowSwapOrder = {
      ...quote,
      buyAmount: slippageDeductedBuyAmount.toFixed(0),
      sellAmount: sellAmountPlusProtocolFees.toFixed(0),
      // from,
      sellTokenBalance: ERC20_TOKEN_BALANCE,
      buyTokenBalance: ERC20_TOKEN_BALANCE,
      quoteId: id,
      appDataHash,
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
