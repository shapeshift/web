import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosInstance } from 'axios'
import * as rax from 'retry-axios'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { BuildTradeInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType } from 'lib/swapper/api'
import { DEFAULT_SLIPPAGE } from 'lib/swapper/swappers/utils/constants'
import { normalizeAmount } from 'lib/swapper/swappers/utils/helpers/helpers'
import type { ZrxQuoteResponse, ZrxTrade } from 'lib/swapper/swappers/ZrxSwapper/types'
import { withAxiosRetry } from 'lib/swapper/swappers/ZrxSwapper/utils/applyAxiosRetry'
import { AFFILIATE_ADDRESS, DEFAULT_SOURCE } from 'lib/swapper/swappers/ZrxSwapper/utils/constants'
import {
  assertValidTradePair,
  assetToToken,
  baseUrlFromChainId,
  getTreasuryAddressForReceiveAsset,
} from 'lib/swapper/swappers/ZrxSwapper/utils/helpers/helpers'
import { zrxServiceFactory } from 'lib/swapper/swappers/ZrxSwapper/utils/zrxService'
import { isEvmChainAdapter } from 'lib/utils'
import { convertBasisPointsToDecimalPercentage } from 'state/zustand/swapperStore/utils'

export async function zrxBuildTrade(
  input: BuildTradeInput,
): Promise<Result<ZrxTrade, SwapErrorRight>> {
  const { sellAsset, buyAsset, slippage, accountNumber, receiveAddress, affiliateBps, chainId } =
    input
  const sellAmount = input.sellAmountBeforeFeesCryptoBaseUnit

  const adapterManager = getChainAdapterManager()
  const adapter = adapterManager.get(chainId)

  if (!adapter || !isEvmChainAdapter(adapter)) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid chain adapter',
        code: SwapErrorType.UNSUPPORTED_CHAIN,
        details: { adapter },
      }),
    )
  }

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

  if (!receiveAddress)
    return Err(
      makeSwapErrorRight({
        message: 'Receive address is required for ZRX trades',
        code: SwapErrorType.MISSING_INPUT,
      }),
    )

  const { average } = await adapter.getFeeData({
    to: quote.to,
    value: quote.value,
    chainSpecific: {
      from: receiveAddress,
      contractData: quote.data,
    },
  })

  const trade: ZrxTrade = {
    sellAsset,
    buyAsset,
    accountNumber,
    receiveAddress,
    rate: quote.price,
    depositAddress: quote.to,
    feeData: {
      networkFeeCryptoBaseUnit: average.txFee,
      protocolFees: {},
    },
    txData: quote.data,
    buyAmountBeforeFeesCryptoBaseUnit: quote.buyAmount,
    sellAmountBeforeFeesCryptoBaseUnit: quote.sellAmount,
    sources: quote.sources?.filter(s => parseFloat(s.proportion) > 0) || DEFAULT_SOURCE,
  }

  return Ok(trade as ZrxTrade)
}
