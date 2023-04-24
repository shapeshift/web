import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosResponse } from 'axios'
import * as rax from 'retry-axios'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { erc20AllowanceAbi } from 'lib/swapper/swappers/utils/abi/erc20Allowance-abi'
import { APPROVAL_GAS_LIMIT, DEFAULT_SLIPPAGE } from 'lib/swapper/swappers/utils/constants'
import { isApprovalRequired, normalizeAmount } from 'lib/swapper/swappers/utils/helpers/helpers'
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
  { adapter, web3 }: ZrxSwapperDeps,
  input: BuildTradeInput,
): Promise<Result<ZrxTrade<T>, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmountExcludeFeeCryptoBaseUnit,
    slippage,
    accountNumber,
    receiveAddress,
  } = input
  const adapterChainId = adapter.getChainId()

  if (buyAsset.chainId !== adapterChainId) {
    return Err(
      makeSwapErrorRight({
        message: `[zrxBuildTrade] - buyAsset must be on chainId ${adapterChainId}`,
        code: SwapErrorType.VALIDATION_FAILED,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  const slippagePercentage = slippage ? bnOrZero(slippage).toString() : DEFAULT_SLIPPAGE

  const maybeBaseUrl = baseUrlFromChainId(buyAsset.chainId)
  if (maybeBaseUrl.isErr()) return Err(maybeBaseUrl.unwrapErr())
  const zrxService = zrxServiceFactory(maybeBaseUrl.unwrap())

  /**
   * /swap/v1/quote
   * params: {
   *   sellToken: contract address (or symbol) of token to sell
   *   buyToken: contractAddress (or symbol) of token to buy
   *   sellAmount?: integer string value of the smallest increment of the sell token
   * }
   */

  // @ts-ignore figure out how to fix me
  const zrxRetry = applyAxiosRetry(zrxService, {
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
  const quoteResponse: AxiosResponse<ZrxQuoteResponse> = await zrxRetry.get<ZrxQuoteResponse>(
    '/swap/v1/quote',
    {
      params: {
        buyToken: assetToToken(buyAsset),
        sellToken: assetToToken(sellAsset),
        sellAmount: normalizeAmount(sellAmountExcludeFeeCryptoBaseUnit),
        takerAddress: receiveAddress,
        slippagePercentage,
        skipValidation: false,
        affiliateAddress: AFFILIATE_ADDRESS,
      },
    },
  )

  const {
    data: {
      allowanceTarget,
      sellAmount,
      gasPrice: gasPriceCryptoBaseUnit,
      gas: gasCryptoBaseUnit,
      price,
      to,
      buyAmount: buyAmountCryptoBaseUnit,
      data: txData,
      sources,
    },
  } = quoteResponse

  const estimatedGas = bnOrZero(gasCryptoBaseUnit || 0)
  const networkFee = bnOrZero(estimatedGas)
    .multipliedBy(bnOrZero(gasPriceCryptoBaseUnit))
    .toString()

  const approvalRequired = await isApprovalRequired({
    adapter,
    sellAsset,
    allowanceContract: allowanceTarget,
    receiveAddress,
    sellAmountExcludeFeeCryptoBaseUnit,
    web3,
    erc20AllowanceAbi,
  })

  const approvalFee = bnOrZero(APPROVAL_GAS_LIMIT)
    .multipliedBy(bnOrZero(gasPriceCryptoBaseUnit))
    .toString()

  const trade: ZrxTrade<ZrxSupportedChainId> = {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    rate: price,
    depositAddress: to,
    feeData: {
      chainSpecific: {
        estimatedGasCryptoBaseUnit: estimatedGas.toString(),
        gasPriceCryptoBaseUnit,
        approvalFeeCryptoBaseUnit: approvalRequired ? approvalFee : undefined,
      },
      networkFeeCryptoBaseUnit: networkFee,
      buyAssetTradeFeeUsd: '0',
      sellAssetTradeFeeUsd: '0',
    },
    txData,
    sellAmountBeforeFeesCryptoBaseUnit: sellAmount,
    buyAmountCryptoBaseUnit,
    sources: sources?.filter(s => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
  }
  return Ok(trade as ZrxTrade<T>)
}
