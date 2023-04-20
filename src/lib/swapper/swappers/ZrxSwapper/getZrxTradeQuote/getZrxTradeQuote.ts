import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight, SwapSource, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import { APPROVAL_GAS_LIMIT } from 'lib/swapper/swappers/utils/constants'
import { normalizeAmount } from 'lib/swapper/swappers/utils/helpers/helpers'
import { getZrxMinMax } from 'lib/swapper/swappers/ZrxSwapper/getZrxMinMax/getZrxMinMax'
import type { ZrxPriceResponse } from 'lib/swapper/swappers/ZrxSwapper/types'
import { DEFAULT_SOURCE } from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import {
  assetToToken,
  baseUrlFromChainId,
} from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

export async function getZrxTradeQuote<T extends ZrxSupportedChainId>(
  input: GetEvmTradeQuoteInput,
): Promise<Result<TradeQuote<T>, SwapErrorRight>> {
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

    const { minimumAmountCryptoHuman, maximumAmountCryptoHuman } = await getZrxMinMax(
      sellAsset,
      buyAsset,
    )
    const minQuoteSellAmountCryptoBaseUnit = bnOrZero(minimumAmountCryptoHuman).times(
      bn(10).exponentiatedBy(sellAsset.precision),
    )

    const normalizedSellAmount = normalizeAmount(
      bnOrZero(sellAmountCryptoBaseUnit).eq(0)
        ? minQuoteSellAmountCryptoBaseUnit
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

    if (!quoteResponse.data)
      return Err(
        makeSwapErrorRight({
          message: '[getZrxTradeQuote] Bad ZRX response, no data was returned',
          code: SwapErrorType.TRADE_QUOTE_FAILED,
        }),
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
      minimumCryptoHuman: minimumAmountCryptoHuman,
      maximumCryptoHuman: maximumAmountCryptoHuman,
      feeData: {
        chainSpecific: {
          estimatedGasCryptoBaseUnit: estimatedGas.toString(),
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
    return Ok(tradeQuote as TradeQuote<T>)
  } catch (e) {
    // TODO(gomes): scrutinize what can throw above and don't throw, because monads
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
        message: '[getZrxTradeQuote]',
        cause: e,
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  }
}
