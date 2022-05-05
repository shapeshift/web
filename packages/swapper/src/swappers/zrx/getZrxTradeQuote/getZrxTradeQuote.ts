import { ChainTypes, SwapSource } from '@shapeshiftoss/types'
import { AxiosResponse } from 'axios'

import { GetTradeQuoteInput, TradeQuote } from '../../../api'
import { getZrxMinMax } from '../getZrxMinMax/getZrxMinMax'
import { ZrxPriceResponse } from '../types'
import { bnOrZero } from '../utils/bignumber'
import { APPROVAL_GAS_LIMIT, DEFAULT_SOURCE } from '../utils/constants'
import { normalizeAmount } from '../utils/helpers/helpers'
import { zrxService } from '../utils/zrxService'
import { ZrxError } from '../ZrxSwapper'

export async function getZrxTradeQuote(
  input: GetTradeQuoteInput
): Promise<TradeQuote<ChainTypes.Ethereum>> {
  const { sellAsset, buyAsset, sellAmount, buyAmount, sellAssetAccountId } = input
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

  const { minimum: minQuoteSellAmount, maximum: maxSellAmount } = await getZrxMinMax(input)

  const minQuoteSellAmountWei = bnOrZero(minQuoteSellAmount).times(
    bnOrZero(10).exponentiatedBy(sellAsset.precision)
  )

  const amount = useSellAmount ? { sellAmount } : { buyAmount }
  const amountKey = Object.keys(amount)[0]
  const amountValue = Object.values(amount)[0]

  let normalizedAmount = normalizeAmount(amountValue)
  if (!normalizedAmount || normalizedAmount === '0') {
    normalizedAmount = normalizeAmount(minQuoteSellAmountWei?.toString())
  }

  if (!normalizedAmount || normalizedAmount === '0') {
    throw new ZrxError('getQuote - Must have valid sellAmount, buyAmount or minimum amount')
  }

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
    const quoteResponse: AxiosResponse<ZrxPriceResponse> = await zrxService.get<ZrxPriceResponse>(
      '/swap/v1/price',
      {
        params: {
          sellToken,
          buyToken,
          [amountKey]: normalizedAmount
        }
      }
    )

    const { data } = quoteResponse

    const estimatedGas = bnOrZero(data.estimatedGas).times(1.5)
    const rate = useSellAmount ? data.price : bnOrZero(1).div(data.price).toString()

    return {
      success: true,
      statusReason: '',
      rate,
      minimum: minQuoteSellAmount,
      maximum: maxSellAmount,
      feeData: {
        fee: bnOrZero(estimatedGas).multipliedBy(bnOrZero(data.gasPrice)).toString(),
        chainSpecific: {
          estimatedGas: estimatedGas.toString(),
          gasPrice: data.gasPrice,
          approvalFee:
            sellAsset.tokenId &&
            bnOrZero(APPROVAL_GAS_LIMIT).multipliedBy(bnOrZero(data.gasPrice)).toString()
        }
      },
      sellAmount: data.sellAmount,
      buyAmount: data.buyAmount,
      sources:
        data.sources?.filter((s: SwapSource) => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
      allowanceContract: data.allowanceTarget,
      buyAsset,
      sellAsset,
      sellAssetAccountId
    }
  } catch (e) {
    const statusReason =
      e?.response?.data?.validationErrors?.[0]?.reason ||
      e?.response?.data?.reason ||
      'Unknown Error'
    // This hackyness will go away when we correctly handle errors
    return {
      success: false,
      statusReason,
      maximum: '0',
      minimum: '0',
      rate: '0',
      feeData: { fee: '0', chainSpecific: {} },
      buyAmount: '0',
      sellAmount: '0',
      sources: [],
      allowanceContract: '0',
      buyAsset,
      sellAsset,
      sellAssetAccountId
    }
  }
}
