import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import * as rax from 'retry-axios'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType } from 'lib/swapper/api'
import { DEFAULT_SLIPPAGE } from 'lib/swapper/swappers/utils/constants'
import { normalizeAmount } from 'lib/swapper/swappers/utils/helpers/helpers'
import type {
  ZrxQuoteResponse,
  ZrxSwapperDeps,
  ZrxTrade,
} from 'lib/swapper/swappers/ZrxSwapper/types'
import { applyAxiosRetry } from 'lib/swapper/swappers/ZrxSwapper/utils/applyAxiosRetry'
import { AFFILIATE_ADDRESS, DEFAULT_SOURCE } from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import {
  assetToToken,
  baseUrlFromChainId,
} from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'
import type { ZrxSupportedChainId } from 'lib/swapper/swappers/ZrxSwapper/ZrxSwapper'

export async function zrxBuildTrade<T extends ZrxSupportedChainId>(
  { adapter }: ZrxSwapperDeps,
  input: BuildTradeInput,
): Promise<Result<ZrxTrade<T>, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit,
    slippage,
    accountNumber,
    receiveAddress,
  } = input

  const baseUrl = baseUrlFromChainId(buyAsset.chainId)
  const zrxService = applyAxiosRetry(zrxServiceFactory(baseUrl), {
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

  try {
    // https://docs.0x.org/0x-swap-api/api-references/get-swap-v1-quote
    const { data: quote }: AxiosResponse<ZrxQuoteResponse> = await zrxService.get<ZrxQuoteResponse>(
      '/swap/v1/quote',
      {
        params: {
          buyToken: assetToToken(buyAsset),
          sellToken: assetToToken(sellAsset),
          sellAmount: normalizeAmount(sellAmountBeforeFeesCryptoBaseUnit),
          takerAddress: receiveAddress,
          slippagePercentage: slippage ? bnOrZero(slippage).toString() : DEFAULT_SLIPPAGE,
          affiliateAddress: AFFILIATE_ADDRESS,
          skipValidation: false,
        },
      },
    )

    const { average: feeData } = await adapter.getFeeData({
      to: quote.to,
      value: quote.value,
      chainSpecific: {
        from: receiveAddress,
        contractAddress: quote.to,
        contractData: quote.data,
      },
    })

    const { chainSpecific: fee, txFee } = feeData

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
          gasPriceCryptoBaseUnit: fee.gasPrice,
          maxFeePerGas: fee.maxFeePerGas,
          maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
        },
        networkFeeCryptoBaseUnit: txFee,
        buyAssetTradeFeeUsd: '0',
        sellAssetTradeFeeUsd: '0',
      },
      txData: quote.data,
      buyAmountCryptoBaseUnit: quote.buyAmount,
      sellAmountBeforeFeesCryptoBaseUnit: quote.sellAmount,
      sources: quote.sources?.filter(s => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
    }

    return Ok(trade as ZrxTrade<T>)
  } catch (e) {
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
        message: '[[zrxBuildTrade]]',
        cause: e,
        code: SwapErrorType.BUILD_TRADE_FAILED,
      }),
    )
  }
}
