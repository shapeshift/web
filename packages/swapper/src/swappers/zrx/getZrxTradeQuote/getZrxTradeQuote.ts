import { fromAssetId } from '@shapeshiftoss/caip'
import { SwapSource } from '@shapeshiftoss/types'
import { AxiosResponse } from 'axios'

import { GetTradeQuoteInput, SwapError, SwapErrorTypes, TradeQuote } from '../../../api'
import { getZrxMinMax } from '../getZrxMinMax/getZrxMinMax'
import { ZrxPriceResponse } from '../types'
import { bn, bnOrZero } from '../utils/bignumber'
import { APPROVAL_GAS_LIMIT, DEFAULT_SOURCE } from '../utils/constants'
import { normalizeAmount } from '../utils/helpers/helpers'
import { zrxService } from '../utils/zrxService'

export async function getZrxTradeQuote(input: GetTradeQuoteInput): Promise<TradeQuote<'eip155:1'>> {
  try {
    const { sellAsset, buyAsset, sellAmount, sellAssetAccountId } = input
    if (buyAsset.chainId !== 'eip155:1' || sellAsset.chainId !== 'eip155:1') {
      throw new SwapError(
        '[getZrxTradeQuote] - Both assets need to be on the Ethereum chain to use Zrx',
        {
          code: SwapErrorTypes.UNSUPPORTED_PAIR,
          details: { buyAssetChainId: buyAsset.chainId, sellAssetChainId: sellAsset.chainId }
        }
      )
    }

    const { assetReference: sellAssetErc20Address, assetNamespace: sellAssetNamespace } =
      fromAssetId(sellAsset.assetId)
    const { assetReference: buyAssetErc20Address, assetNamespace: buyAssetNamespace } = fromAssetId(
      buyAsset.assetId
    )

    const useSellAmount = !!sellAmount
    const buyToken = buyAssetNamespace === 'erc20' ? buyAssetErc20Address : buyAsset.symbol
    const sellToken = sellAssetNamespace === 'erc20' ? sellAssetErc20Address : sellAsset.symbol

    const { minimum, maximum } = await getZrxMinMax(sellAsset, buyAsset)

    const minQuoteSellAmount = bnOrZero(minimum).times(bn(10).exponentiatedBy(sellAsset.precision))

    const normalizedSellAmount = normalizeAmount(
      bnOrZero(sellAmount).eq(0) ? minQuoteSellAmount : sellAmount
    )

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
          sellAmount: normalizedSellAmount
        }
      }
    )

    const { data } = quoteResponse

    const estimatedGas = bnOrZero(data.estimatedGas).times(1.5)
    const rate = useSellAmount ? data.price : bn(1).div(data.price).toString()

    return {
      success: true,
      statusReason: '',
      rate,
      minimum,
      maximum,
      feeData: {
        fee: bnOrZero(estimatedGas).multipliedBy(bnOrZero(data.gasPrice)).toString(),
        chainSpecific: {
          estimatedGas: estimatedGas.toString(),
          gasPrice: data.gasPrice,
          approvalFee:
            sellAssetErc20Address &&
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
    if (e instanceof SwapError) throw e
    throw new SwapError('[getZrxTradeQuote]', { cause: e, code: SwapErrorTypes.TRADE_QUOTE_FAILED })
  }
}
