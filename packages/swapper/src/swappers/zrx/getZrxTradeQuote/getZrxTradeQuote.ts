import { AxiosResponse } from 'axios'

import {
  GetEvmTradeQuoteInput,
  SwapError,
  SwapErrorType,
  SwapSource,
  TradeQuote,
} from '../../../api'
import { bn, bnOrZero } from '../../utils/bignumber'
import { APPROVAL_GAS_LIMIT } from '../../utils/constants'
import { normalizeAmount } from '../../utils/helpers/helpers'
import { getZrxMinMax } from '../getZrxMinMax/getZrxMinMax'
import { ZrxPriceResponse } from '../types'
import { DEFAULT_SOURCE } from '../utils/constants'
import { assetToToken, baseUrlFromChainId } from '../utils/helpers/helpers'
import { zrxServiceFactory } from '../utils/zrxService'
import { ZrxSupportedChainId } from '../ZrxSwapper'

export async function getZrxTradeQuote<T extends ZrxSupportedChainId>(
  input: GetEvmTradeQuoteInput,
): Promise<TradeQuote<T>> {
  try {
    const {
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
      accountNumber,
    } = input
    if (buyAsset.chainId !== input.chainId || sellAsset.chainId !== input.chainId) {
      throw new SwapError(
        '[getZrxTradeQuote] - Both assets need to be on the same supported EVM chain to use Zrx',
        {
          code: SwapErrorType.UNSUPPORTED_PAIR,
          details: { buyAssetChainId: buyAsset.chainId, sellAssetChainId: sellAsset.chainId },
        },
      )
    }

    const buyToken = assetToToken(buyAsset)
    const sellToken = assetToToken(sellAsset)

    const { minimum, maximum } = await getZrxMinMax(sellAsset, buyAsset)
    const minQuotesellAmountCryptoBaseUnit = bnOrZero(minimum).times(
      bn(10).exponentiatedBy(sellAsset.precision),
    )

    const normalizedSellAmount = normalizeAmount(
      bnOrZero(sellAmountCryptoBaseUnit).eq(0)
        ? minQuotesellAmountCryptoBaseUnit
        : sellAmountCryptoBaseUnit,
    )
    const baseUrl = baseUrlFromChainId(buyAsset.chainId)
    const zrxService = zrxServiceFactory(baseUrl)

    /**
     * /swap/v1/price
     * params: {
     *   sellToken: contract address (or symbol) of token to sell
     *   buyToken: contractAddress (or symbol) of token to buy
     *   sellAmount?: integer string value of the smallest increment of the sell token
     *   buyAmount?: integer string value of the smallest increment of the buy token
     * }
     */
    const quoteResponse: AxiosResponse<ZrxPriceResponse> = await zrxService.get<ZrxPriceResponse>(
      '/swap/v1/price',
      {
        params: {
          sellToken,
          buyToken,
          sellAmount: normalizedSellAmount,
        },
      },
    )

    const {
      data: {
        estimatedGas: estimatedGasResponse,
        gasPrice: gasPriceCryptoBaseUnit,
        price,
        sellAmount: sellAmountResponse,
        buyAmount,
        sources,
        allowanceTarget,
      },
    } = quoteResponse

    const useSellAmount = !!sellAmountCryptoBaseUnit
    const rate = useSellAmount ? price : bn(1).div(price).toString()

    const estimatedGas = bnOrZero(estimatedGasResponse).times(1.5)
    const fee = estimatedGas.multipliedBy(bnOrZero(gasPriceCryptoBaseUnit)).toString()

    // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
    // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
    const approvalFeeCryptoBaseUnit = bnOrZero(APPROVAL_GAS_LIMIT)
      .multipliedBy(bnOrZero(gasPriceCryptoBaseUnit))
      .toFixed()

    const tradeQuote: TradeQuote<ZrxSupportedChainId> = {
      rate,
      minimumCryptoHuman: minimum,
      maximum,
      feeData: {
        chainSpecific: {
          estimatedGas: estimatedGas.toString(),
          gasPriceCryptoBaseUnit,
          approvalFeeCryptoBaseUnit,
        },
        networkFeeCryptoBaseUnit: fee,
        buyAssetTradeFeeUsd: '0',
        sellAssetTradeFeeUsd: '0',
      },
      sellAmountBeforeFeesCryptoBaseUnit: sellAmountResponse,
      buyAmountCryptoBaseUnit: buyAmount,
      sources: sources?.filter((s: SwapSource) => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
      allowanceContract: allowanceTarget,
      buyAsset,
      sellAsset,
      accountNumber,
    }
    return tradeQuote as TradeQuote<T>
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getZrxTradeQuote]', { cause: e, code: SwapErrorType.TRADE_QUOTE_FAILED })
  }
}
