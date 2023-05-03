import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosInstance } from 'axios'
import * as rax from 'retry-axios'
import { bnOrZero } from 'lib/bignumber/bignumber'
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
  getTreasuryAddressForReceiveAsset,
} from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'
import { convertBasisPointsToDecimalPercentage } from 'state/zustand/swapperStore/utils'

export async function zrxBuildTrade<T extends ZrxSupportedChainId>(
  { adapter }: ZrxSwapperDeps,
  input: BuildTradeInput,
): Promise<Result<ZrxTrade<T>, SwapErrorRight>> {
  const { sellAsset, buyAsset, slippage, accountNumber, receiveAddress, affiliateBps } = input
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

  const buyTokenPercentageFee = convertBasisPointsToDecimalPercentage(affiliateBps).toNumber()
  const feeRecipient = getTreasuryAddressForReceiveAsset(buyAsset.assetId)

  // https://docs.0x.org/0x-swap-api/api-references/get-swap-v1-quote
  const maybeQuoteResponse = await zrxService.get<ZrxQuoteResponse>('/swap/v1/quote', {
    params: {
      buyToken: assetToToken(buyAsset),
      sellToken: assetToToken(sellAsset),
      sellAmount: normalizeAmount(sellAmount),
      takerAddress: receiveAddress,
      slippagePercentage: slippage ? bnOrZero(slippage).toString() : DEFAULT_SLIPPAGE,
      affiliateAddress: AFFILIATE_ADDRESS, // Used for 0x analytics
      skipValidation: false,
      feeRecipient, // Where affiliate fees are sent
      buyTokenPercentageFee,
    },
  })

  if (maybeQuoteResponse.isErr()) return Err(maybeQuoteResponse.unwrapErr())
  const { data: quote } = maybeQuoteResponse.unwrap()

  const { average } = await adapter.getFeeData({
    to: quote.to,
    value: quote.value,
    chainSpecific: {
      from: receiveAddress,
      contractData: quote.data,
    },
  })

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
        gasPriceCryptoBaseUnit: average.chainSpecific.gasPrice,
        maxFeePerGas: average.chainSpecific.maxFeePerGas,
        maxPriorityFeePerGas: average.chainSpecific.maxPriorityFeePerGas,
      },
      networkFeeCryptoBaseUnit: average.txFee,
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
