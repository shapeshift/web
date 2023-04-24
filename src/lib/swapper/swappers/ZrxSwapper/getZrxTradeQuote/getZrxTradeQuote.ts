import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight, SwapSource, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
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
  const {
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmountCryptoBaseUnit,
    accountNumber,
  } = input
  if (buyAsset.chainId !== input.chainId || sellAsset.chainId !== input.chainId) {
    return Err(
      makeSwapErrorRight({
        message:
          '[getZrxTradeQuote] - Both assets need to be on the same supported EVM chain to use Zrx',
        code: SwapErrorType.UNSUPPORTED_PAIR,
        details: { buyAssetChainId: buyAsset.chainId, sellAssetChainId: sellAsset.chainId },
      }),
    )
  }

  const buyToken = assetToToken(buyAsset)
  const sellToken = assetToToken(sellAsset)

  const maybeZrxMinMax = await getZrxMinMax(sellAsset, buyAsset)

  if (maybeZrxMinMax.isErr()) {
    return Err(maybeZrxMinMax.unwrapErr())
  }
  const { minimumAmountCryptoHuman, maximumAmountCryptoHuman } = maybeZrxMinMax.unwrap()

  const minQuoteSellAmountCryptoBaseUnit = bnOrZero(minimumAmountCryptoHuman).times(
    bn(10).exponentiatedBy(sellAsset.precision),
  )

  const normalizedSellAmount = normalizeAmount(
    bnOrZero(sellAmountCryptoBaseUnit).eq(0)
      ? minQuoteSellAmountCryptoBaseUnit
      : sellAmountCryptoBaseUnit,
  )
  const maybeBaseUrl = baseUrlFromChainId(buyAsset.chainId)
  if (maybeBaseUrl.isErr()) {
    return Err(maybeBaseUrl.unwrapErr())
  }
  const zrxService = zrxServiceFactory(maybeBaseUrl.unwrap())

  /**
   * /swap/v1/price
   * params: {
   *   sellToken: contract address (or symbol) of token to sell
   *   buyToken: contractAddress (or symbol) of token to buy
   *   sellAmount?: integer string value of the smallest increment of the sell token
   *   buyAmount?: integer string value of the smallest increment of the buy token
   * }
   */
  return (
    await zrxService.get<ZrxPriceResponse>('/swap/v1/price', {
      params: {
        sellToken,
        buyToken,
        sellAmount: normalizedSellAmount,
      },
    })
  ).map(quoteResponse => {
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
    return tradeQuote as TradeQuote<T>
  })
}
