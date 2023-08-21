import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignMessage } from '@shapeshiftoss/hdwallet-core'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { Err } from '@sniptt/monads'
import type { Result } from '@sniptt/monads/build'
import type { AxiosError } from 'axios'
import BigNumber from 'bignumber.js'
import { getConfig } from 'config'
import { ethers } from 'ethers'
import { v4 as uuid } from 'uuid'
import { bn } from 'lib/bignumber/bignumber'
import type {
  GetEvmTradeQuoteInput,
  GetTradeQuoteInput,
  GetUnsignedTxArgs,
  SwapErrorRight,
  Swapper2Api,
  TradeQuote2,
} from 'lib/swapper/api'
import { createTradeAmountTooSmallErr } from 'lib/swapper/utils'
import { assertGetEvmChainAdapter, createDefaultStatusResponse } from 'lib/utils/evm'
import {
  convertDecimalPercentageToBasisPoints,
  subtractBasisPointAmount,
} from 'state/slices/tradeQuoteSlice/utils'

import { isNativeEvmAsset } from '../utils/helpers/helpers'
import { getCowSwapTradeQuote } from './getCowSwapTradeQuote/getCowSwapTradeQuote'
import type {
  CowSignTx,
  CowSwapGetTradesResponse,
  CowSwapGetTransactionsResponse,
  CowSwapQuoteResponse,
} from './types'
import {
  COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS,
  COW_SWAP_SETTLEMENT_ADDRESS,
  DEFAULT_APP_DATA,
  ERC20_TOKEN_BALANCE,
  ORDER_KIND_BUY,
  ORDER_KIND_SELL,
} from './utils/constants'
import { cowService } from './utils/cowService'
import type { CowSwapOrder } from './utils/helpers/helpers'
import {
  domain,
  getCowswapNetwork,
  getNowPlusThirtyMinutesTimestamp,
  getValuesFromQuoteResponse,
  hashOrder,
} from './utils/helpers/helpers'

const tradeQuoteMetadata: Map<string, { chainId: EvmChainId }> = new Map()

export const cowApi: Swapper2Api = {
  getTradeQuote: async (
    input: GetTradeQuoteInput,
  ): Promise<Result<TradeQuote2[], SwapErrorRight>> => {
    const tradeQuoteResult = await getCowSwapTradeQuote(input as GetEvmTradeQuoteInput)
    const { receiveAddress } = input

    return tradeQuoteResult.map(tradeQuote => {
      const id = uuid()
      tradeQuoteMetadata.set(id, { chainId: tradeQuote.steps[0].sellAsset.chainId as EvmChainId })
      return [
        {
          id,
          receiveAddress,
          affiliateBps: undefined,
          ...tradeQuote,
        },
      ]
    })
  },

  getUnsignedTx: async ({
    from,
    tradeQuote,
    stepIndex,
    slippageTolerancePercentageDecimal,
  }: GetUnsignedTxArgs): Promise<CowSignTx> => {
    const { accountNumber, buyAsset, sellAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } =
      tradeQuote.steps[stepIndex]
    const { receiveAddress } = tradeQuote

    const buyTokenAddress = !isNativeEvmAsset(buyAsset.assetId)
      ? fromAssetId(buyAsset.assetId).assetReference
      : COW_SWAP_NATIVE_ASSET_MARKER_ADDRESS

    const maybeNetwork = getCowswapNetwork(sellAsset.chainId)
    if (maybeNetwork.isErr()) throw maybeNetwork.unwrapErr()

    const network = maybeNetwork.unwrap()
    const baseUrl = getConfig().REACT_APP_COWSWAP_BASE_URL

    // https://api.cow.fi/docs/#/default/post_api_v1_quote
    const maybeQuoteResponse = await cowService.post<CowSwapQuoteResponse>(
      `${baseUrl}/${network}/api/v1/quote/`,
      {
        sellToken: fromAssetId(sellAsset.assetId).assetReference,
        buyToken: buyTokenAddress,
        receiver: receiveAddress,
        validTo: getNowPlusThirtyMinutesTimestamp(),
        appData: DEFAULT_APP_DATA,
        partiallyFillable: false,
        from,
        kind: ORDER_KIND_SELL,
        sellAmountBeforeFee: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      },
    )

    if (maybeQuoteResponse.isErr()) throw maybeQuoteResponse.unwrapErr()

    const slippageBps = slippageTolerancePercentageDecimal
      ? convertDecimalPercentageToBasisPoints(slippageTolerancePercentageDecimal)
      : undefined

    const { buyAmountAfterFeesCryptoBaseUnit } = getValuesFromQuoteResponse({
      buyAsset,
      sellAsset,
      response: maybeQuoteResponse.unwrap().data,
    })

    // If user has specified slippage, we need to get a second quote using the buyAmount from the quote (which includes fees)
    // So it's (buyAmount - fees) - slippage, which will be the buyAmountAfterFees to use to get the new quote
    const maybeQuoteWithSlippageResponse = slippageBps
      ? await cowService.post<CowSwapQuoteResponse>(`${baseUrl}/${network}/api/v1/quote/`, {
          sellToken: fromAssetId(sellAsset.assetId).assetReference,
          buyToken: buyTokenAddress,
          receiver: receiveAddress,
          validTo: getNowPlusThirtyMinutesTimestamp(),
          appData: DEFAULT_APP_DATA,
          partiallyFillable: false,
          from,
          kind: ORDER_KIND_BUY,
          buyAmountAfterFee: subtractBasisPointAmount(
            buyAmountAfterFeesCryptoBaseUnit,
            slippageBps,
            BigNumber.ROUND_DOWN,
          ),
        })
      : undefined

    if (maybeQuoteWithSlippageResponse?.isErr()) {
      const err = maybeQuoteWithSlippageResponse.unwrapErr()
      const errData = (err.cause as AxiosError)?.response?.data
      if (
        (err.cause as AxiosError)?.isAxiosError &&
        errData?.errorType === 'SellAmountDoesNotCoverFee'
      ) {
        throw Err(
          createTradeAmountTooSmallErr({
            assetId: sellAsset.assetId,
            minAmountCryptoBaseUnit: bn(errData?.data.fee_amount ?? '0x0', 16).toFixed(),
          }),
        )
      }
      throw Err(maybeQuoteWithSlippageResponse.unwrapErr())
    }

    // If we have a quote with slippage, use that data, otherwise use the original quote data
    const cowSwapQuoteResponse =
      maybeQuoteWithSlippageResponse && maybeQuoteWithSlippageResponse?.isOk()
        ? maybeQuoteWithSlippageResponse.unwrap().data
        : maybeQuoteResponse.unwrap().data

    const { id, quote } = cowSwapQuoteResponse
    const orderToSign: CowSwapOrder = {
      ...quote,
      // from,
      sellTokenBalance: ERC20_TOKEN_BALANCE,
      buyTokenBalance: ERC20_TOKEN_BALANCE,
      quoteId: id,
    }

    const adapter = assertGetEvmChainAdapter(sellAsset.chainId)
    const { chainReference } = fromChainId(sellAsset.chainId)
    const signingDomain = Number(chainReference)

    // We need to construct orderDigest, sign it and send it to cowSwap API, in order to submit a trade
    // Some context about this : https://docs.cow.fi/tutorials/how-to-submit-orders-via-the-api/4.-signing-the-order
    // For more info, check hashOrder method implementation
    const orderDigest = hashOrder(domain(signingDomain, COW_SWAP_SETTLEMENT_ADDRESS), orderToSign)

    const bip44Params = adapter.getBIP44Params({ accountNumber })

    const messageToSign: ETHSignMessage = {
      addressNList: toAddressNList(bip44Params),
      message: ethers.utils.arrayify(orderDigest),
    }

    return { orderToSign, messageToSign }
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
