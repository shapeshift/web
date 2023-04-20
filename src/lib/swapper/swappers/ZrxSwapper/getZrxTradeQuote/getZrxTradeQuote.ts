import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import { APPROVAL_GAS_LIMIT } from 'lib/swapper/swappers/utils/constants'
import { normalizeAmount } from 'lib/swapper/swappers/utils/helpers/helpers'
import { getZrxMinMax } from 'lib/swapper/swappers/ZrxSwapper/getZrxMinMax/getZrxMinMax'
import type { ZrxPriceResponse, ZrxSwapperDeps } from 'lib/swapper/swappers/ZrxSwapper/types'
import { AFFILIATE_ADDRESS, DEFAULT_SOURCE } from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import {
  assetToToken,
  baseUrlFromChainId,
} from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

export async function getZrxTradeQuote<T extends ZrxSupportedChainId>(
  { adapter }: ZrxSwapperDeps,
  input: GetEvmTradeQuoteInput,
): Promise<Result<TradeQuote<T>, SwapErrorRight>> {
  const { sellAsset, buyAsset, sellAmountBeforeFeesCryptoBaseUnit, accountNumber, receiveAddress } =
    input

  const baseUrl = baseUrlFromChainId(buyAsset.chainId)
  const zrxService = zrxServiceFactory(baseUrl)

  try {
    const { minimumAmountCryptoHuman, maximumAmountCryptoHuman } = await getZrxMinMax(
      sellAsset,
      buyAsset,
    )
    const minQuoteSellAmountCryptoBaseUnit = bnOrZero(minimumAmountCryptoHuman).times(
      bn(10).exponentiatedBy(sellAsset.precision),
    )

    const normalizedSellAmount = normalizeAmount(
      bnOrZero(sellAmountBeforeFeesCryptoBaseUnit).eq(0)
        ? minQuoteSellAmountCryptoBaseUnit
        : sellAmountBeforeFeesCryptoBaseUnit,
    )

    // https://docs.0x.org/0x-swap-api/api-references/get-swap-v1-price
    const { data: price } = await zrxService.get<ZrxPriceResponse>('/swap/v1/price', {
      params: {
        buyToken: assetToToken(buyAsset),
        sellToken: assetToToken(sellAsset),
        sellAmount: normalizedSellAmount,
        takerAddress: receiveAddress,
        affiliateAddress: AFFILIATE_ADDRESS,
        skipValidation: true,
      },
    })

    if (!price) {
      return Err(
        makeSwapErrorRight({
          message: '[getZrxTradeQuote] Bad ZRX response, no data was returned',
          code: SwapErrorType.TRADE_QUOTE_FAILED,
        }),
      )
    }

    const { average: fee } = await adapter.getGasFeeData()

    // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
    // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
    const approvalFeeCryptoBaseUnit = bnOrZero(APPROVAL_GAS_LIMIT)
      .multipliedBy(bnOrZero(fee.maxFeePerGas ?? price.gasPrice))
      .toString()

    const useSellAmount = !!sellAmountBeforeFeesCryptoBaseUnit
    const rate = useSellAmount ? price.price : bn(1).div(price.price).toString()
    const txFee = bn(price.gas).times(bnOrZero(fee.maxFeePerGas ?? price.gasPrice))

    const tradeQuote: TradeQuote<ZrxSupportedChainId> = {
      buyAsset,
      sellAsset,
      accountNumber,
      rate,
      minimumCryptoHuman: minimumAmountCryptoHuman,
      maximumCryptoHuman: maximumAmountCryptoHuman,
      feeData: {
        chainSpecific: {
          estimatedGasCryptoBaseUnit: price.gas,
          gasPriceCryptoBaseUnit: fee.gasPrice,
          maxFeePerGas: fee.maxFeePerGas,
          maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
          approvalFeeCryptoBaseUnit,
        },
        networkFeeCryptoBaseUnit: txFee.toFixed(0),
        buyAssetTradeFeeUsd: '0',
        sellAssetTradeFeeUsd: '0',
      },
      allowanceContract: price.allowanceTarget,
      buyAmountCryptoBaseUnit: price.buyAmount,
      sellAmountBeforeFeesCryptoBaseUnit: price.sellAmount,
      sources: price.sources?.filter(s => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
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
