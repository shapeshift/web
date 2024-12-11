import type { EvmChainId, OrderCreation } from '@shapeshiftoss/types'
import { BuyTokenDestination, SellTokenSource, SigningScheme } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads/build'
import type { InterpolationOptions } from 'node-polyglot'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../constants'
import {
  assertGetCowNetwork,
  getAffiliateAppDataFragmentByChainId,
  getFullAppData,
} from '../../cowswap-utils'
import type {
  CommonTradeQuoteInput,
  EvmMessageToSign,
  GetEvmTradeQuoteInputBase,
  GetEvmTradeRateInput,
  GetTradeRateInput,
  GetUnsignedEvmMessageArgs,
  SwapErrorRight,
  SwapperApi,
  TradeQuote,
  TradeRate,
} from '../../types'
import { SwapperName } from '../../types'
import {
  checkSafeTransactionStatus,
  createDefaultStatusResponse,
  getHopByIndex,
  isExecutableTradeQuote,
} from '../../utils'
import { getCowSwapTradeQuote } from './getCowSwapTradeQuote/getCowSwapTradeQuote'
import { getCowSwapTradeRate } from './getCowSwapTradeRate/getCowSwapTradeRate'
import type { CowSwapGetTradesResponse, CowSwapGetTransactionsResponse } from './types'
import { cowService } from './utils/cowService'
import { deductAffiliateFeesFromAmount, deductSlippageFromAmount } from './utils/helpers/helpers'

const tradeQuoteMetadata: Map<string, { chainId: EvmChainId }> = new Map()

export const cowApi: SwapperApi = {
  getTradeQuote: async (
    input: CommonTradeQuoteInput,
    { config },
  ): Promise<Result<TradeQuote[], SwapErrorRight>> => {
    const tradeQuoteResult = await getCowSwapTradeQuote(input as GetEvmTradeQuoteInputBase, config)

    return tradeQuoteResult.map(tradeQuote => {
      // A quote always has a first step
      const firstStep = getHopByIndex(tradeQuote, 0)!
      const id = uuid()
      tradeQuoteMetadata.set(id, { chainId: firstStep.sellAsset.chainId as EvmChainId })
      return [tradeQuote]
    })
  },
  getTradeRate: async (
    input: GetTradeRateInput,
    { config },
  ): Promise<Result<TradeRate[], SwapErrorRight>> => {
    const tradeRateResult = await getCowSwapTradeRate(input as GetEvmTradeRateInput, config)

    return tradeRateResult.map(tradeRate => {
      // A rate always has a first step
      const firstStep = getHopByIndex(tradeRate, 0)!
      const id = uuid()
      tradeQuoteMetadata.set(id, { chainId: firstStep.sellAsset.chainId as EvmChainId })
      return [tradeRate]
    })
  },

  getUnsignedEvmMessage: async ({
    tradeQuote,
    stepIndex,
    chainId,
  }: GetUnsignedEvmMessageArgs): Promise<EvmMessageToSign> => {
    const hop = getHopByIndex(tradeQuote, stepIndex)

    if (!hop) throw new Error(`No hop found for stepIndex ${stepIndex}`)

    const { sellAsset } = hop
    const {
      slippageTolerancePercentageDecimal = getDefaultSlippageDecimalPercentageForSwapper(
        SwapperName.CowSwap,
      ),
    } = tradeQuote

    if (!isExecutableTradeQuote(tradeQuote)) throw new Error('Unable to execute trade')

    // Check the chainId is supported for paranoia
    assertGetCowNetwork(sellAsset.chainId)

    const affiliateAppDataFragment = getAffiliateAppDataFragmentByChainId({
      affiliateBps: tradeQuote.affiliateBps,
      chainId: sellAsset.chainId,
    })
    const { appDataHash } = await getFullAppData(
      slippageTolerancePercentageDecimal,
      affiliateAppDataFragment,
      'market',
    )

    const { cowswapQuoteResponse } = hop

    if (!cowswapQuoteResponse) throw new Error('CowSwap quote data is required')

    const { id, quote } = cowswapQuoteResponse
    // Note: While CowSwap returns us a quote, and we have slippageBips in the appData, this isn't enough.
    // For the slippage actually to be enforced, the final message to be signed needs to have slippage deducted.
    // Failure to do so means orders may take forever to be filled, or never be filled at all.
    const quoteBuyAmount = quote.buyAmount

    // Remove affiliate fees off the buyAmount to get the amount after affiliate fees, but before slippage bips
    const buyAmountAfterAffiliateFeesCryptoBaseUnit = deductAffiliateFeesFromAmount({
      amount: quoteBuyAmount,
      affiliateBps: tradeQuote.affiliateBps,
    })
    const buyAmountAfterAffiliateFeesAndSlippageCryptoBaseUnit = deductSlippageFromAmount({
      amount: buyAmountAfterAffiliateFeesCryptoBaseUnit,
      slippageTolerancePercentageDecimal,
    }).toFixed(0)

    // CoW API and flow is weird - same idea as the mutation above, we need to incorporate protocol fees into the order
    // This was previously working as-is with fees being deducted from the sell amount at protocol-level, but we now we need to add them into the order
    // In other words, this means what was previously CoW being "feeless" as far as we're concerned
    // i.e no additional fees to account for when doing balance checks, no longer holds true
    //
    // This also makes CoW the first and currently *only* swapper where max token swaps aren't full balance
    const sellAmountPlusProtocolFees = bn(quote.sellAmount).plus(quote.feeAmount)
    const orderToSign: Omit<OrderCreation, 'signature'> = {
      ...quote,
      // Another mutation from the original quote to go around the fact that CoW API flow is weird
      // they return us a quote with fees, but we have to zero them out when sending the order
      feeAmount: '0',
      buyAmount: buyAmountAfterAffiliateFeesAndSlippageCryptoBaseUnit,
      sellAmount: sellAmountPlusProtocolFees.toFixed(0),
      // from,
      sellTokenBalance: SellTokenSource.ERC20,
      buyTokenBalance: BuyTokenDestination.ERC20,
      quoteId: id,
      appDataHash,
      signingScheme: SigningScheme.EIP712,
    }

    return { chainId, orderToSign }
  },

  checkTradeStatus: async ({
    txHash, // TODO: this is not a tx hash, its an ID
    chainId,
    accountId,
    fetchIsSmartContractAddressQuery,
    assertGetEvmChainAdapter,
    config,
  }): Promise<{
    status: TxStatus
    buyTxHash: string | undefined
    message: string | [string, InterpolationOptions] | undefined
  }> => {
    const maybeSafeTransactionStatus = await checkSafeTransactionStatus({
      txHash,
      chainId,
      assertGetEvmChainAdapter,
      fetchIsSmartContractAddressQuery,
      accountId,
    })
    if (maybeSafeTransactionStatus) return maybeSafeTransactionStatus

    const network = assertGetCowNetwork(chainId)

    // with cow we aren't able to get the tx hash until it's already completed, so we must use the
    // order uid to fetch the trades and use their existence as indicating "complete"
    // https://docs.cow.fi/tutorials/how-to-submit-orders-via-the-api/6.-checking-order-status
    const maybeTradesResponse = await cowService.get<CowSwapGetTradesResponse>(
      `${config.REACT_APP_COWSWAP_BASE_URL}/${network}/api/v1/trades`,
      { params: { orderUid: txHash } },
    )

    if (maybeTradesResponse.isErr()) throw maybeTradesResponse.unwrapErr()
    const { data: trades } = maybeTradesResponse.unwrap()
    const buyTxHash = trades[0]?.txHash

    if (!buyTxHash) return createDefaultStatusResponse(undefined)

    const maybeGetOrdersResponse = await cowService.get<CowSwapGetTransactionsResponse>(
      `${config.REACT_APP_COWSWAP_BASE_URL}/${network}/api/v1/transactions/${buyTxHash}/orders`,
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
