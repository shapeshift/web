import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight, TradeQuote } from 'lib/swapper/api'
import { APPROVAL_GAS_LIMIT } from 'lib/swapper/swappers/utils/constants'
import { normalizeAmount } from 'lib/swapper/swappers/utils/helpers/helpers'
import { getZrxMinMax } from 'lib/swapper/swappers/ZrxSwapper/getZrxMinMax/getZrxMinMax'
import type { ZrxPriceResponse, ZrxSwapperDeps } from 'lib/swapper/swappers/ZrxSwapper/types'
import { AFFILIATE_ADDRESS, DEFAULT_SOURCE } from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import {
  assertValidTradePair,
  assetToToken,
  baseUrlFromChainId,
} from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

export async function getZrxTradeQuote<T extends ZrxSupportedChainId>(
  { adapter }: ZrxSwapperDeps,
  input: GetEvmTradeQuoteInput,
): Promise<Result<TradeQuote<T>, SwapErrorRight>> {
  const { sellAsset, buyAsset, accountNumber, receiveAddress } = input
  const sellAmount = input.sellAmountBeforeFeesCryptoBaseUnit

  const assertion = assertValidTradePair({ adapter, buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const maybeBaseUrl = baseUrlFromChainId(buyAsset.chainId)
  if (maybeBaseUrl.isErr()) return Err(maybeBaseUrl.unwrapErr())
  const zrxService = zrxServiceFactory(maybeBaseUrl.unwrap())

  const maybeZrxMinMax = await getZrxMinMax(sellAsset, buyAsset)
  if (maybeZrxMinMax.isErr()) {
    return Err(maybeZrxMinMax.unwrapErr())
  }
  const { minimumAmountCryptoHuman, maximumAmountCryptoHuman } = maybeZrxMinMax.unwrap()

  const minQuoteSellAmountCryptoBaseUnit = bnOrZero(minimumAmountCryptoHuman).times(
    bn(10).exponentiatedBy(sellAsset.precision),
  )

  const normalizedSellAmount = normalizeAmount(
    bnOrZero(sellAmount).eq(0) ? minQuoteSellAmountCryptoBaseUnit : sellAmount,
  )

  const { average, fast } = await adapter.getGasFeeData()

  // https://docs.0x.org/0x-swap-api/api-references/get-swap-v1-price
  return (
    await zrxService.get<ZrxPriceResponse>('/swap/v1/price', {
      params: {
        buyToken: assetToToken(buyAsset),
        sellToken: assetToToken(sellAsset),
        sellAmount: normalizedSellAmount,
        takerAddress: receiveAddress,
        affiliateAddress: AFFILIATE_ADDRESS,
        skipValidation: true,
      },
    })
  ).map(({ data }) => {
    // use worst case average eip1559 vs fast legacy
    const maxGasPrice = bnOrZero(BigNumber.max(average.maxFeePerGas ?? 0, fast.gasPrice))

    // 0x approvals are cheaper than trades, but we don't have dynamic quote data for them.
    // Instead, we use a hardcoded gasLimit estimate in place of the estimatedGas in the 0x quote response.
    const approvalFeeCryptoBaseUnit = bn(APPROVAL_GAS_LIMIT).times(maxGasPrice).toFixed(0)

    const useSellAmount = !!sellAmount
    const rate = useSellAmount ? data.price : bn(1).div(data.price).toString()
    const gasLimit = bnOrZero(data.gas)
    const txFee = gasLimit.times(maxGasPrice)

    const tradeQuote: TradeQuote<ZrxSupportedChainId> = {
      buyAsset,
      sellAsset,
      accountNumber,
      rate,
      minimumCryptoHuman: minimumAmountCryptoHuman,
      maximumCryptoHuman: maximumAmountCryptoHuman,
      feeData: {
        chainSpecific: {
          estimatedGasCryptoBaseUnit: gasLimit.toFixed(0),
          gasPriceCryptoBaseUnit: fast.gasPrice, // fast gas price since it is underestimated currently
          maxFeePerGas: average.maxFeePerGas,
          maxPriorityFeePerGas: average.maxPriorityFeePerGas,
          approvalFeeCryptoBaseUnit,
        },
        networkFeeCryptoBaseUnit: txFee.toFixed(0),
        buyAssetTradeFeeUsd: '0',
        sellAssetTradeFeeUsd: '0',
      },
      allowanceContract: data.allowanceTarget,
      buyAmountCryptoBaseUnit: data.buyAmount,
      sellAmountBeforeFeesCryptoBaseUnit: data.sellAmount,
      sources: data.sources?.filter(s => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
    }

    return tradeQuote as TradeQuote<T>
  })
}
