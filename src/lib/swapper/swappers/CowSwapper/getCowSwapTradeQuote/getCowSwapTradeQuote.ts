import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import axios from 'axios'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { GetTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import type { CowSwapperDeps } from 'lib/swapper/swappers/CowSwapper/CowSwapper'
import { getCowSwapMinMax } from 'lib/swapper/swappers/CowSwapper/getCowSwapMinMax/getCowSwapMinMax'
import type { CowSwapQuoteResponse } from 'lib/swapper/swappers/CowSwapper/types'
import {
  COW_SWAP_ETH_MARKER_ADDRESS,
  COW_SWAP_VAULT_RELAYER_ADDRESS,
  DEFAULT_ADDRESS,
  DEFAULT_APP_DATA,
  DEFAULT_SOURCE,
  ORDER_KIND_SELL,
} from 'lib/swapper/swappers/CowSwapper/utils/constants'
import { cowService } from 'lib/swapper/swappers/CowSwapper/utils/cowService'
import type { CowSwapSellQuoteApiInput } from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'
import {
  getNowPlusThirtyMinutesTimestamp,
  getUsdRate,
} from 'lib/swapper/swappers/CowSwapper/utils/helpers/helpers'
import {
  getApproveContractData,
  normalizeIntegerAmount,
} from 'lib/swapper/swappers/utils/helpers/helpers'

export async function getCowSwapTradeQuote(
  deps: CowSwapperDeps,
  input: GetTradeQuoteInput,
): Promise<Result<TradeQuote<KnownChainIds.EthereumMainnet>, SwapErrorRight>> {
  try {
    const { adapter, web3 } = deps
    const { sellAsset, buyAsset, accountNumber, receiveAddress } = input
    const sellAmount = input.sellAmountBeforeFeesCryptoBaseUnit

    const { assetReference: sellAssetErc20Address, assetNamespace: sellAssetNamespace } =
      fromAssetId(sellAsset.assetId)

    const { assetReference: buyAssetErc20Address, chainId: buyAssetChainId } = fromAssetId(
      buyAsset.assetId,
    )

    if (sellAssetNamespace !== 'erc20') {
      throw new SwapError('[getCowSwapTradeQuote] - Sell asset needs to be ERC-20 to use CowSwap', {
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { sellAssetNamespace },
      })
    }

    if (buyAssetChainId !== KnownChainIds.EthereumMainnet) {
      throw new SwapError(
        '[getCowSwapTradeQuote] - Buy asset needs to be on ETH mainnet to use CowSwap',
        {
          code: SwapErrorType.UNSUPPORTED_PAIR,
          details: { buyAssetChainId },
        },
      )
    }

    const buyToken =
      buyAsset.assetId !== ethAssetId ? buyAssetErc20Address : COW_SWAP_ETH_MARKER_ADDRESS

    const { minimumAmountCryptoHuman, maximumAmountCryptoHuman } = await getCowSwapMinMax(
      deps,
      sellAsset,
      buyAsset,
    )

    const minQuoteSellAmount = bnOrZero(minimumAmountCryptoHuman).times(
      bn(10).exponentiatedBy(sellAsset.precision),
    )
    const isSellAmountBelowMinimum = bnOrZero(sellAmount).lt(minQuoteSellAmount)

    // making sure we do not have decimals for cowswap api (can happen at least from minQuoteSellAmount)
    const normalizedSellAmountCryptoBaseUnit = normalizeIntegerAmount(
      isSellAmountBelowMinimum ? minQuoteSellAmount : sellAmount,
    )

    // https://api.cow.fi/docs/#/default/post_api_v1_quote
    const { data } = await cowService.post<CowSwapQuoteResponse>(`${deps.apiUrl}/v1/quote/`, {
      sellToken: sellAssetErc20Address,
      buyToken,
      receiver: DEFAULT_ADDRESS,
      validTo: getNowPlusThirtyMinutesTimestamp(),
      appData: DEFAULT_APP_DATA,
      partiallyFillable: false,
      from: DEFAULT_ADDRESS,
      kind: ORDER_KIND_SELL,
      sellAmountBeforeFee: normalizedSellAmountCryptoBaseUnit,
    } as CowSwapSellQuoteApiInput)

    const {
      quote: {
        buyAmount: buyAmountCryptoBaseUnit,
        sellAmount: sellAmountCryptoBaseUnit,
        feeAmount: feeAmountInSellTokenCryptoBaseUnit,
      },
    } = data

    const quoteSellAmountPlusFeesCryptoBaseUnit = bnOrZero(sellAmountCryptoBaseUnit).plus(
      feeAmountInSellTokenCryptoBaseUnit,
    )

    const buyCryptoAmount = bn(buyAmountCryptoBaseUnit).div(
      bn(10).exponentiatedBy(buyAsset.precision),
    )
    const sellCryptoAmount = bn(sellAmountCryptoBaseUnit).div(
      bn(10).exponentiatedBy(sellAsset.precision),
    )
    const rate = buyCryptoAmount.div(sellCryptoAmount).toString()

    const approveData = getApproveContractData({
      web3,
      spenderAddress: COW_SWAP_VAULT_RELAYER_ADDRESS,
      contractAddress: sellAssetErc20Address,
    })

    const [feeData, sellAssetUsdRate] = await Promise.all([
      adapter.getFeeData({
        to: sellAssetErc20Address,
        value: '0',
        chainSpecific: { from: receiveAddress, contractData: approveData },
      }),
      getUsdRate(deps, sellAsset),
    ])

    const sellAssetTradeFeeUsd = bnOrZero(feeAmountInSellTokenCryptoBaseUnit)
      .div(bn(10).exponentiatedBy(sellAsset.precision))
      .multipliedBy(bnOrZero(sellAssetUsdRate))
      .toString()

    const isQuoteSellAmountBelowMinimum = bnOrZero(quoteSellAmountPlusFeesCryptoBaseUnit).lt(
      minQuoteSellAmount,
    )
    // If isQuoteSellAmountBelowMinimum we don't want to replace it with normalizedSellAmount
    // The purpose of this was to get a quote from CowSwap even with small amounts
    const quoteSellAmountCryptoBaseUnit = isQuoteSellAmountBelowMinimum
      ? sellAmount
      : normalizedSellAmountCryptoBaseUnit

    // Similarly, if isQuoteSellAmountBelowMinimum we can't use the buy amount from the quote
    // because we aren't actually selling the minimum amount (we are attempting to sell an amount less than it)
    const quoteBuyAmountCryptoBaseUnit = isQuoteSellAmountBelowMinimum
      ? '0'
      : buyAmountCryptoBaseUnit

    const { average } = feeData

    return Ok({
      rate,
      minimumCryptoHuman: minimumAmountCryptoHuman,
      maximumCryptoHuman: maximumAmountCryptoHuman,
      feeData: {
        networkFeeCryptoBaseUnit: '0', // no miner fee for CowSwap
        chainSpecific: {
          estimatedGasCryptoBaseUnit: average.chainSpecific.gasLimit,
          gasPriceCryptoBaseUnit: average.chainSpecific.gasPrice,
          maxFeePerGas: average.chainSpecific.maxFeePerGas,
          maxPriorityFeePerGas: average.chainSpecific.maxPriorityFeePerGas,
          approvalFeeCryptoBaseUnit: average.txFee,
        },
        buyAssetTradeFeeUsd: '0', // Trade fees for buy Asset are always 0 since trade fees are subtracted from sell asset
        sellAssetTradeFeeUsd,
      },
      sellAmountBeforeFeesCryptoBaseUnit: quoteSellAmountCryptoBaseUnit,
      buyAmountCryptoBaseUnit: quoteBuyAmountCryptoBaseUnit,
      sources: DEFAULT_SOURCE,
      allowanceContract: COW_SWAP_VAULT_RELAYER_ADDRESS,
      buyAsset,
      sellAsset,
      accountNumber,
    })
    // TODO(gomes): scrutinize what can throw above and don't throw, because monads
  } catch (e) {
    if (
      axios.isAxiosError(e) &&
      e.response?.status === 400 &&
      (e as AxiosError<{ errorType: string }>).response?.data.errorType ===
        'SellAmountDoesNotCoverFee'
    ) {
      return Err(
        makeSwapErrorRight({
          message: '[getCowSwapTradeQuote]',
          cause: e,
          code: SwapErrorType.TRADE_QUOTE_INPUT_LOWER_THAN_FEES,
        }),
      )
    }
    if (e instanceof SwapError)
      return Err(
        makeSwapErrorRight({
          message: e.message,
          code: e.code,
          details: e.details,
        }),
      )
    return Err(
      makeSwapErrorRight({
        message: '[getCowSwapTradeQuote]',
        cause: e,
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  }
}
