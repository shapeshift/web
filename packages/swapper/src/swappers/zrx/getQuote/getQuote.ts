import { AxiosResponse } from 'axios'
import BigNumber from 'bignumber.js'
import { ChainTypes, GetQuoteInput, Quote, QuoteResponse, SwapSource } from '@shapeshiftoss/types'

import { MAX_ZRX_TRADE, APPROVAL_GAS_LIMIT, DEFAULT_SOURCE } from '../utils/constants'
import { zrxService } from '../utils/zrxService'
import { normalizeAmount } from '../utils/helpers/helpers'
import { ZrxError } from '../ZrxSwapper'

export async function getZrxQuote(input: GetQuoteInput): Promise<Quote> {
  const {
    sellAsset,
    buyAsset,
    sellAmount,
    minimumPrice,
    minimum: minQuoteSellAmount,
    slippage
  } = input
  if (!sellAmount) {
    throw new ZrxError('getQuote - sellAmount is required')
  }

  if (buyAsset.chain !== ChainTypes.Ethereum) {
    throw new ZrxError('getQuote - Both assets need to be on the Ethereum chain to use Zrx')
  }
  if (sellAsset.chain !== ChainTypes.Ethereum) {
    throw new ZrxError('getQuote - Both assets need to be on the Ethereum chain to use Zrx')
  }

  const buyToken = buyAsset.tokenId || buyAsset.symbol
  const sellToken = sellAsset.tokenId || sellAsset.symbol

  let minQuoteSellAmountWei = null
  if (minQuoteSellAmount) {
    minQuoteSellAmountWei = new BigNumber(minQuoteSellAmount as string).times(
      new BigNumber(10).exponentiatedBy(sellAsset.precision)
    )
  }

  const normalizedSellAmount =
    !normalizeAmount(sellAmount) || normalizeAmount(sellAmount) === '0'
      ? normalizeAmount(minQuoteSellAmountWei?.toString())
      : normalizeAmount(sellAmount)
  if (!normalizedSellAmount || normalizedSellAmount === '0') {
    throw new ZrxError('getQuote - Must have valid sellAmount or minimum amount')
  }

  const slippagePercentage = slippage ? new BigNumber(slippage).div(100).toString() : undefined

  try {
    /**
     * /swap/v1/price
     * params: {
     *   sellToken: contract address (or symbol) of token to sell
     *   buyToken: contractAddress (or symbol) of token to buy
     *   sellAmount?: integer string value of the smallest increment of the sell token
     *   buyAmount?: integer string value of the smallest incremtent of the buy token
     * }
     */
    const quoteResponse: AxiosResponse<QuoteResponse> = await zrxService.get<QuoteResponse>(
      '/swap/v1/price',
      {
        params: {
          sellToken,
          buyToken,
          sellAmount: normalizedSellAmount,
          slippagePercentage
        }
      }
    )

    const { data } = quoteResponse
    const quotePrice = new BigNumber(data.price)
    const priceDifference = quotePrice.minus(minimumPrice as string)
    const priceImpact = priceDifference
      .dividedBy(minimumPrice as string)
      .abs()
      .valueOf()

    const estimatedGas = data.estimatedGas
      ? new BigNumber(data.estimatedGas).times(1.5)
      : new BigNumber(0)
    return {
      sellAsset,
      buyAsset,
      priceImpact,
      slippage,
      success: true,
      statusCode: 0,
      rate: data.price,
      minimum: minQuoteSellAmount, // $1 worth of the sell token.
      maximum: MAX_ZRX_TRADE, // Arbitrarily large value. 10e+28 here.
      feeData: {
        fee: new BigNumber(estimatedGas || 0)
          .multipliedBy(new BigNumber(data.gasPrice || 0))
          .toString(),
        estimatedGas: estimatedGas.toString(),
        gasPrice: data.gasPrice,
        approvalFee:
          sellAsset.tokenId &&
          new BigNumber(APPROVAL_GAS_LIMIT).multipliedBy(data.gasPrice || 0).toString()
      },
      sellAmount: data.sellAmount,
      buyAmount: data.buyAmount,
      guaranteedPrice: data.guaranteedPrice,
      sources:
        data.sources?.filter((s: SwapSource) => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE
    }
  } catch (e) {
    const statusCode =
      e?.response?.data?.validationErrors?.[0]?.code || e?.response?.data?.code || -1
    const statusReason =
      e?.response?.data?.validationErrors?.[0]?.reason ||
      e?.response?.data?.reason ||
      'Unknown Error'
    return {
      sellAsset,
      buyAsset,
      minimum: minQuoteSellAmount,
      maximum: MAX_ZRX_TRADE,
      success: false,
      statusCode,
      statusReason
    }
  }
}
