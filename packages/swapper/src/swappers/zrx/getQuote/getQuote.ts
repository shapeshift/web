import { AxiosResponse } from 'axios'
import BigNumber from 'bignumber.js'
import {
  ChainTypes,
  GetQuoteInput,
  Quote,
  QuoteResponse,
  SwapperType,
  SwapSource
} from '@shapeshiftoss/types'
import { MAX_ZRX_TRADE, APPROVAL_GAS_LIMIT, DEFAULT_SOURCE } from '../utils/constants'
import { zrxService } from '../utils/zrxService'
import { normalizeAmount } from '../utils/helpers/helpers'
import { ZrxError } from '../ZrxSwapper'

export async function getZrxQuote(
  input: GetQuoteInput
): Promise<Quote<ChainTypes.Ethereum, SwapperType>> {
  const {
    sellAsset,
    buyAsset,
    sellAmount,
    buyAmount,
    minimumPrice,
    minimum: minQuoteSellAmount,
    slippage
  } = input
  if (!buyAsset) {
    throw new ZrxError('getQuote - Missing buyAsset')
  }
  if (!sellAsset) {
    throw new ZrxError('getQuote - Missing sellAsset')
  }
  if (buyAsset.chain !== ChainTypes.Ethereum || sellAsset.chain !== ChainTypes.Ethereum) {
    throw new ZrxError('getQuote - Both assets need to be on the Ethereum chain to use Zrx')
  }
  if (!sellAmount && !buyAmount) {
    throw new ZrxError('getQuote - sellAmount or buyAmount amount is required')
  }

  const useSellAmount = !!sellAmount
  const buyToken = buyAsset.tokenId || buyAsset.symbol
  const sellToken = sellAsset.tokenId || sellAsset.symbol

  let minQuoteSellAmountWei = null
  if (minQuoteSellAmount) {
    minQuoteSellAmountWei = new BigNumber(minQuoteSellAmount as string).times(
      new BigNumber(10).exponentiatedBy(sellAsset.precision)
    )
  }

  const amount = useSellAmount ? { sellAmount } : { buyAmount }
  const amountKey = Object.keys(amount)[0]
  const amountValue = Object.values(amount)[0]

  const normalizedAmount =
    !normalizeAmount(amountValue) || normalizeAmount(amountValue) === '0'
      ? normalizeAmount(minQuoteSellAmountWei?.toString())
      : normalizeAmount(amountValue)

  if (!normalizedAmount || normalizedAmount === '0') {
    throw new ZrxError('getQuote - Must have valid sellAmount, buyAmount or minimum amount')
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
          slippagePercentage,
          [amountKey]: normalizedAmount
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
    const rate = useSellAmount ? data.price : new BigNumber(1).div(data.price).toString()

    return {
      sellAsset,
      buyAsset,
      priceImpact,
      slippage,
      success: true,
      statusCode: 0,
      rate,
      minimum: minQuoteSellAmount, // $1 worth of the sell token.
      maximum: MAX_ZRX_TRADE, // Arbitrarily large value. 10e+28 here.
      feeData: {
        fee: new BigNumber(estimatedGas || 0)
          .multipliedBy(new BigNumber(data.gasPrice || 0))
          .toString(),
        chainSpecific: {
          estimatedGas: estimatedGas.toString(),
          gasPrice: data.gasPrice,
          approvalFee:
            sellAsset.tokenId &&
            new BigNumber(APPROVAL_GAS_LIMIT).multipliedBy(data.gasPrice || 0).toString()
        }
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
