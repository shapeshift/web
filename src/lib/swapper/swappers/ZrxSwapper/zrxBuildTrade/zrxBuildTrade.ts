import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosInstance } from 'axios'
import * as rax from 'retry-axios'
import { BigNumber, bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { DEFAULT_SLIPPAGE } from 'lib/swapper/swappers/utils/constants'
import { normalizeAmount } from 'lib/swapper/swappers/utils/helpers/helpers'
import type {
  ZrxQuoteResponse,
  ZrxSwapperDeps,
  ZrxTrade,
} from 'lib/swapper/swappers/ZrxSwapper/types'
import { withAxiosRetry } from 'lib/swapper/swappers/ZrxSwapper/utils/applyAxiosRetry'
import { AFFILIATE_ADDRESS, DEFAULT_SOURCE } from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import {
  assertValidTradePair,
  assetToToken,
  baseUrlFromChainId,
} from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

export async function zrxBuildTrade<T extends ZrxSupportedChainId>(
  { adapter }: ZrxSwapperDeps,
  input: BuildTradeInput,
): Promise<Result<ZrxTrade<T>, SwapErrorRight>> {
  const { sellAsset, buyAsset, slippage, accountNumber, receiveAddress } = input
  const sellAmount = input.sellAmountBeforeFeesCryptoBaseUnit

  const assertion = assertValidTradePair({ adapter, buyAsset, sellAsset })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const maybeBaseUrl = baseUrlFromChainId(buyAsset.chainId)
  if (maybeBaseUrl.isErr()) return Err(maybeBaseUrl.unwrapErr())
  // TODO(gomes): Is this the right way to do the higher-order dance here?
  const withZrxAxiosRetry = (baseService: AxiosInstance) =>
    withAxiosRetry(baseService, {
      statusCodesToRetry: [[400, 400]],
      shouldRetry: err => {
        const cfg = rax.getConfig(err)
        const retryAttempt = cfg?.currentRetryAttempt ?? 0
        const retry = cfg?.retry ?? 3
        // ensure max retries is always respected
        if (retryAttempt >= retry) return false
        // retry if 0x returns error code 111 Gas estimation failed
        if (err?.response?.data?.code === 111) return true

        // Handle the request based on your other config options, e.g. `statusCodesToRetry`
        return rax.shouldRetryRequest(err)
      },
    })
  const zrxService = zrxServiceFactory({
    baseUrl: maybeBaseUrl.unwrap(),
    wrapper: withZrxAxiosRetry,
  })

  // https://docs.0x.org/0x-swap-api/api-references/get-swap-v1-quote
  const maybeQuoteResponse = await zrxService.get<ZrxQuoteResponse>('/swap/v1/quote', {
    params: {
      buyToken: assetToToken(buyAsset),
      sellToken: assetToToken(sellAsset),
      sellAmount: normalizeAmount(sellAmount),
      takerAddress: receiveAddress,
      slippagePercentage: slippage ? bnOrZero(slippage).toString() : DEFAULT_SLIPPAGE,
      affiliateAddress: AFFILIATE_ADDRESS,
      skipValidation: false,
    },
  })

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())
  const { data: quote } = maybeQuoteResponse.unwrap()

  const { average, fast } = await adapter.getFeeData({
    to: quote.to,
    value: quote.value,
    chainSpecific: {
      from: receiveAddress,
      contractData: quote.data,
    },
  })
  // use worst case average eip1559 vs fast legacy
  const maxGasPrice = BigNumber.max(
    average.chainSpecific.maxFeePerGas ?? 0,
    fast.chainSpecific.gasPrice,
  )

  const txFee = bnOrZero(bn(fast.chainSpecific.gasLimit).times(maxGasPrice))

  const trade: ZrxTrade<ZrxSupportedChainId> = {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    rate: quote.price,
    depositAddress: quote.to,
    feeData: {
      chainSpecific: {
        estimatedGasCryptoBaseUnit: quote.gas,
        gasPriceCryptoBaseUnit: fast.chainSpecific.gasPrice, // fast gas price since it is underestimated currently
        maxFeePerGas: average.chainSpecific.maxFeePerGas,
        maxPriorityFeePerGas: average.chainSpecific.maxPriorityFeePerGas,
      },
      networkFeeCryptoBaseUnit: txFee.toFixed(0),
      buyAssetTradeFeeUsd: '0',
      sellAssetTradeFeeUsd: '0',
    },
    txData: quote.data,
    buyAmountCryptoBaseUnit: quote.buyAmount,
    sellAmountBeforeFeesCryptoBaseUnit: quote.sellAmount,
    sources: quote.sources?.filter(s => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
  }

  return Ok(trade as ZrxTrade<T>)
}
