import { ethAssetId, fromAssetId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import axios, { AxiosError, AxiosResponse } from 'axios'

import { GetTradeQuoteInput, SwapError, SwapErrorTypes, TradeQuote } from '../../../api'
import { bn, bnOrZero } from '../../utils/bignumber'
import { getApproveContractData, normalizeIntegerAmount } from '../../utils/helpers/helpers'
import { CowSwapperDeps } from '../CowSwapper'
import { getCowSwapMinMax } from '../getCowSwapMinMax/getCowSwapMinMax'
import { CowSwapQuoteResponse } from '../types'
import {
  COW_SWAP_ETH_MARKER_ADDRESS,
  COW_SWAP_VAULT_RELAYER_ADDRESS,
  DEFAULT_ADDRESS,
  DEFAULT_APP_DATA,
  DEFAULT_SOURCE,
  ORDER_KIND_SELL,
} from '../utils/constants'
import { cowService } from '../utils/cowService'
import {
  CowSwapSellQuoteApiInput,
  getNowPlusThirtyMinutesTimestamp,
  getUsdRate,
} from '../utils/helpers/helpers'

export async function getCowSwapTradeQuote(
  deps: CowSwapperDeps,
  input: GetTradeQuoteInput,
): Promise<TradeQuote<KnownChainIds.EthereumMainnet>> {
  try {
    const {
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit,
      accountNumber,
      receiveAddress,
    } = input
    const { adapter, web3 } = deps

    const { assetReference: sellAssetErc20Address, assetNamespace: sellAssetNamespace } =
      fromAssetId(sellAsset.assetId)
    const { assetReference: buyAssetErc20Address, chainId: buyAssetChainId } = fromAssetId(
      buyAsset.assetId,
    )

    if (sellAssetNamespace !== 'erc20') {
      throw new SwapError('[getCowSwapTradeQuote] - Sell asset needs to be ERC-20 to use CowSwap', {
        code: SwapErrorTypes.UNSUPPORTED_PAIR,
        details: { sellAssetNamespace },
      })
    }

    if (buyAssetChainId !== KnownChainIds.EthereumMainnet) {
      throw new SwapError(
        '[getCowSwapTradeQuote] - Buy asset needs to be on ETH mainnet to use CowSwap',
        {
          code: SwapErrorTypes.UNSUPPORTED_PAIR,
          details: { buyAssetChainId },
        },
      )
    }

    const buyToken =
      buyAsset.assetId !== ethAssetId ? buyAssetErc20Address : COW_SWAP_ETH_MARKER_ADDRESS
    const { minimum, maximum } = await getCowSwapMinMax(deps, sellAsset, buyAsset)

    const minQuoteSellAmount = bnOrZero(minimum).times(bn(10).exponentiatedBy(sellAsset.precision))

    // making sure we do not have decimals for cowswap api (can happen at least from minQuoteSellAmount)
    const normalizedSellAmount = normalizeIntegerAmount(
      bnOrZero(sellAmountBeforeFeesCryptoBaseUnit).lt(minQuoteSellAmount)
        ? minQuoteSellAmount
        : sellAmountBeforeFeesCryptoBaseUnit,
    )

    const apiInput: CowSwapSellQuoteApiInput = {
      sellToken: sellAssetErc20Address,
      buyToken,
      receiver: DEFAULT_ADDRESS,
      validTo: getNowPlusThirtyMinutesTimestamp(),
      appData: DEFAULT_APP_DATA,
      partiallyFillable: false,
      from: DEFAULT_ADDRESS,
      kind: ORDER_KIND_SELL,
      sellAmountBeforeFee: normalizedSellAmount,
    }

    /**
     * /v1/quote
     * params: {
     * sellToken: contract address of token to sell
     * buyToken: contractAddress of token to buy
     * receiver: receiver address can be defaulted to "0x0000000000000000000000000000000000000000"
     * validTo: time duration during which quote is valid (eg : 1654851610 as timestamp)
     * appData: appData for the CowSwap quote that can be used later, can be defaulted to "0x0000000000000000000000000000000000000000000000000000000000000000"
     * partiallyFillable: false
     * from: sender address can be defaulted to "0x0000000000000000000000000000000000000000"
     * kind: "sell" or "buy"
     * sellAmountBeforeFee / buyAmountAfterFee: amount in base unit
     * }
     */
    const quoteResponse: AxiosResponse<CowSwapQuoteResponse> =
      await cowService.post<CowSwapQuoteResponse>(`${deps.apiUrl}/v1/quote/`, apiInput)

    const {
      data: {
        quote: {
          buyAmount: buyAmountCryptoBaseUnit,
          sellAmount: sellAmountCryptoBaseUnit,
          feeAmount: feeAmountInSellTokenCryptoBaseUnit,
        },
      },
    } = quoteResponse

    const buyCryptoAmount = bn(buyAmountCryptoBaseUnit).div(
      bn(10).exponentiatedBy(buyAsset.precision),
    )
    const sellCryptoAmount = bn(sellAmountCryptoBaseUnit).div(
      bn(10).exponentiatedBy(sellAsset.precision),
    )
    const rate = buyCryptoAmount.div(sellCryptoAmount).toString()

    const data = getApproveContractData({
      web3,
      spenderAddress: COW_SWAP_VAULT_RELAYER_ADDRESS,
      contractAddress: sellAssetErc20Address,
    })

    const [feeDataOptions, sellAssetUsdRate] = await Promise.all([
      adapter.getFeeData({
        to: sellAssetErc20Address,
        value: '0',
        chainSpecific: { from: receiveAddress, contractData: data },
      }),
      getUsdRate(deps, sellAsset),
    ])

    const sellAssetTradeFeeUsd = bnOrZero(feeAmountInSellTokenCryptoBaseUnit)
      .div(bn(10).exponentiatedBy(sellAsset.precision))
      .multipliedBy(bnOrZero(sellAssetUsdRate))
      .toString()

    const feeData = feeDataOptions['fast']

    // If original sellAmount is < minQuoteSellAmount, we don't want to replace it with normalizedSellAmount
    // The purpose of this was to get a quote from CowSwap even with small amounts
    const quoteSellAmount = bnOrZero(sellAmountCryptoBaseUnit).lt(minQuoteSellAmount)
      ? sellAmountBeforeFeesCryptoBaseUnit
      : normalizedSellAmount

    return {
      rate,
      minimumCryptoHuman: minimum,
      maximum,
      feeData: {
        networkFeeCryptoBaseUnit: '0', // no miner fee for CowSwap
        chainSpecific: {
          estimatedGas: feeData.chainSpecific.gasLimit,
          gasPriceCryptoBaseUnit: feeData.chainSpecific.gasPrice,
          approvalFeeCryptoBaseUnit: bnOrZero(feeData.chainSpecific.gasLimit)
            .multipliedBy(bnOrZero(feeData.chainSpecific.gasPrice))
            .toString(),
        },
        buyAssetTradeFeeUsd: '0', // Trade fees for buy Asset are always 0 since trade fees are subtracted from sell asset
        sellAssetTradeFeeUsd,
      },
      sellAmountBeforeFeesCryptoBaseUnit: quoteSellAmount,
      buyAmountCryptoBaseUnit,
      sources: DEFAULT_SOURCE,
      allowanceContract: COW_SWAP_VAULT_RELAYER_ADDRESS,
      buyAsset,
      sellAsset,
      accountNumber,
    }
  } catch (e) {
    if (
      axios.isAxiosError(e) &&
      e.response?.status === 400 &&
      (e as AxiosError<{ errorType: string }>).response?.data.errorType ===
        'SellAmountDoesNotCoverFee'
    ) {
      throw new SwapError('[getCowSwapTradeQuote]', {
        cause: e,
        code: SwapErrorTypes.TRADE_QUOTE_INPUT_LOWER_THAN_FEES,
      })
    }
    if (e instanceof SwapError) throw e
    throw new SwapError('[getCowSwapTradeQuote]', {
      cause: e,
      code: SwapErrorTypes.TRADE_QUOTE_FAILED,
    })
  }
}
