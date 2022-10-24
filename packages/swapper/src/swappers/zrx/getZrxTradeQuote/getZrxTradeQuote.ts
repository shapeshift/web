import { fromAssetId } from '@shapeshiftoss/caip'
import { AxiosResponse } from 'axios'

import {
  EvmSupportedChainIds,
  GetEvmTradeQuoteInput,
  SwapError,
  SwapErrorTypes,
  SwapSource,
  TradeQuote,
} from '../../../api'
import { bn, bnOrZero } from '../../utils/bignumber'
import { APPROVAL_GAS_LIMIT } from '../../utils/constants'
import { normalizeAmount } from '../../utils/helpers/helpers'
import { getZrxMinMax } from '../getZrxMinMax/getZrxMinMax'
import { ZrxPriceResponse } from '../types'
import { DEFAULT_SOURCE } from '../utils/constants'
import { baseUrlFromChainId } from '../utils/helpers/helpers'
import { zrxServiceFactory } from '../utils/zrxService'

export async function getZrxTradeQuote<T extends EvmSupportedChainIds>(
  input: GetEvmTradeQuoteInput,
): Promise<TradeQuote<T>> {
  try {
    const { sellAsset, buyAsset, sellAmountCryptoPrecision, bip44Params } = input
    if (buyAsset.chainId !== input.chainId || sellAsset.chainId !== input.chainId) {
      throw new SwapError(
        '[getZrxTradeQuote] - Both assets need to be on the same supported EVM chain to use Zrx',
        {
          code: SwapErrorTypes.UNSUPPORTED_PAIR,
          details: { buyAssetChainId: buyAsset.chainId, sellAssetChainId: sellAsset.chainId },
        },
      )
    }

    const { assetReference: sellAssetErc20Address, assetNamespace: sellAssetNamespace } =
      fromAssetId(sellAsset.assetId)
    const { assetReference: buyAssetErc20Address, assetNamespace: buyAssetNamespace } = fromAssetId(
      buyAsset.assetId,
    )

    const useSellAmount = !!sellAmountCryptoPrecision
    const buyToken = buyAssetNamespace === 'erc20' ? buyAssetErc20Address : buyAsset.symbol
    const sellToken = sellAssetNamespace === 'erc20' ? sellAssetErc20Address : sellAsset.symbol
    const { minimum, maximum } = await getZrxMinMax(sellAsset, buyAsset)
    const minQuotesellAmountCryptoPrecision = bnOrZero(minimum).times(
      bn(10).exponentiatedBy(sellAsset.precision),
    )

    const normalizedSellAmount = normalizeAmount(
      bnOrZero(sellAmountCryptoPrecision).eq(0)
        ? minQuotesellAmountCryptoPrecision
        : sellAmountCryptoPrecision,
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
        gasPrice,
        price,
        sellAmount: sellAmountResponse,
        buyAmount,
        sources,
        allowanceTarget,
      },
    } = quoteResponse

    const estimatedGas = bnOrZero(estimatedGasResponse).times(1.5)
    const rate = useSellAmount ? price : bn(1).div(price).toString()

    const fee = bnOrZero(estimatedGas).multipliedBy(bnOrZero(gasPrice)).toString()
    // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
    // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
    const approvalFee =
      sellAssetErc20Address &&
      bnOrZero(APPROVAL_GAS_LIMIT).multipliedBy(bnOrZero(gasPrice)).toString()

    const tradeQuote: TradeQuote<EvmSupportedChainIds> = {
      rate,
      minimumCryptoHuman: minimum,
      maximum,
      feeData: {
        chainSpecific: {
          estimatedGas: estimatedGas.toString(),
          gasPrice,
          approvalFee,
        },
        networkFee: fee,
        buyAssetTradeFeeUsd: '0',
        sellAssetTradeFeeUsd: '0',
      },
      sellAmountCryptoPrecision: sellAmountResponse,
      buyAmountCryptoPrecision: buyAmount,
      sources: sources?.filter((s: SwapSource) => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
      allowanceContract: allowanceTarget,
      buyAsset,
      sellAsset,
      bip44Params,
    }
    return tradeQuote as TradeQuote<T>
  } catch (e) {
    if (e instanceof SwapError) throw e
    throw new SwapError('[getZrxTradeQuote]', { cause: e, code: SwapErrorTypes.TRADE_QUOTE_FAILED })
  }
}
