import { Err } from '@sniptt/monads/build'
import type { AxiosInstance } from 'axios'
import * as rax from 'retry-axios'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { convertBasisPointsToDecimalPercentage } from 'state/zustand/swapperStore/utils'

import { DEFAULT_SLIPPAGE } from '../../utils/constants'
import { getTreasuryAddressFromChainId, normalizeAmount } from '../../utils/helpers/helpers'
import type { ZrxQuoteResponse } from '../types'
import { withAxiosRetry } from './applyAxiosRetry'
import { AFFILIATE_ADDRESS } from './constants'
import { assetToToken, baseUrlFromChainId } from './helpers/helpers'
import { zrxServiceFactory } from './zrxService'

export type FetchZrxQuoteInput = {
  buyAsset: Asset
  sellAsset: Asset
  receiveAddress: string
  slippage?: string
  affiliateBps: string
  sellAmountBeforeFeesCryptoBaseUnit: string
}

export const fetchZrxQuote = async ({
  buyAsset,
  sellAsset,
  receiveAddress,
  slippage,
  affiliateBps,
  sellAmountBeforeFeesCryptoBaseUnit,
}: FetchZrxQuoteInput) => {
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

  const maybeBaseUrl = baseUrlFromChainId(buyAsset.chainId)
  if (maybeBaseUrl.isErr()) return Err(maybeBaseUrl.unwrapErr())

  const zrxService = zrxServiceFactory({
    baseUrl: maybeBaseUrl.unwrap(),
    wrapper: withZrxAxiosRetry,
  })

  const buyTokenPercentageFee = convertBasisPointsToDecimalPercentage(affiliateBps).toNumber()
  const feeRecipient = getTreasuryAddressFromChainId(buyAsset.chainId)

  // https://docs.0x.org/0x-swap-api/api-references/get-swap-v1-quote
  const maybeQuoteResponse = await zrxService.get<ZrxQuoteResponse>('/swap/v1/quote', {
    params: {
      buyToken: assetToToken(buyAsset),
      sellToken: assetToToken(sellAsset),
      sellAmount: normalizeAmount(sellAmountBeforeFeesCryptoBaseUnit),
      takerAddress: receiveAddress,
      slippagePercentage: slippage ? bnOrZero(slippage).toString() : DEFAULT_SLIPPAGE,
      affiliateAddress: AFFILIATE_ADDRESS, // Used for 0x analytics
      skipValidation: false,
      feeRecipient, // Where affiliate fees are sent
      buyTokenPercentageFee,
    },
  })

  return maybeQuoteResponse
}
