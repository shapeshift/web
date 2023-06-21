import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosInstance } from 'axios'
import * as rax from 'retry-axios'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { DEFAULT_SLIPPAGE } from 'lib/swapper/swappers/utils/constants'
import { normalizeAmount } from 'lib/swapper/swappers/utils/helpers/helpers'
import type { ZrxQuoteResponse, ZrxTrade } from 'lib/swapper/swappers/ZrxSwapper/types'
import { withAxiosRetry } from 'lib/swapper/swappers/ZrxSwapper/utils/applyAxiosRetry'
import { AFFILIATE_ADDRESS, DEFAULT_SOURCE } from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import {
  assertValidTrade,
  assetToToken,
  baseUrlFromChainId,
  getAdapter,
  getTreasuryAddressForReceiveAsset,
} from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'
import { getFees } from 'lib/utils/evm'
import { convertBasisPointsToDecimalPercentage } from 'state/zustand/swapperStore/utils'

export async function zrxBuildTrade(
  input: BuildTradeInput,
): Promise<Result<ZrxTrade, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    slippage,
    accountNumber,
    receiveAddress,
    affiliateBps,
    chainId,
    sendAddress: from,
    wallet,
  } = input
  const sellAmount = input.sellAmountBeforeFeesCryptoBaseUnit

  const assertion = assertValidTrade({ buyAsset, sellAsset, receiveAddress })
  if (assertion.isErr()) return Err(assertion.unwrapErr())

  const maybeAdapter = getAdapter(chainId)
  if (maybeAdapter.isErr()) return Err(maybeAdapter.unwrapErr())
  const adapter = maybeAdapter.unwrap()

  const maybeBaseUrl = baseUrlFromChainId(buyAsset.chainId)
  if (maybeBaseUrl.isErr()) return Err(maybeBaseUrl.unwrapErr())

  // TODO(gomes): Is this the right way to do the higher-order dance here?
  const withZrxAxiosRetry = (baseService: AxiosInstance) => {
    return withAxiosRetry(baseService, {
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
  }

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

  // Note, we pass the supportsEIP1559 for consistency, but this will always evaluate to false for external consumers, which won't pass a wallet
  // That's expected and correct, since we can't assume which wallet they're using
  const supportsEIP1559 = Boolean(
    wallet && supportsETH(wallet) && (await wallet.ethSupportsEIP1559()),
  )
  try {
    if (!from) throw new Error('sendAddress is required')
    const { networkFeeCryptoBaseUnit } = await getFees({
      supportsEIP1559,
      from,
      adapter,
      to: quote.to,
      value: quote.value,
      data: quote.data,
    })

    return Ok({
      sellAsset,
      buyAsset,
      accountNumber,
      receiveAddress,
      rate: quote.price,
      depositAddress: quote.to,
      feeData: {
        networkFeeCryptoBaseUnit,
        protocolFees: {},
      },
      txData: quote.data,
      buyAmountBeforeFeesCryptoBaseUnit: quote.buyAmount,
      sellAmountBeforeFeesCryptoBaseUnit: quote.sellAmount,
      sources: quote.sources?.filter(s => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
    })
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: '[Zrx: buildTrade] - failed to get fees',
        cause: err,
        code: SwapErrorType.BUILD_TRADE_FAILED,
      }),
    )
  }
}
