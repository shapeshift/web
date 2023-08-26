import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { getConfig } from 'config'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { convertBasisPointsToPercentage } from 'state/slices/tradeQuoteSlice/utils'

import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import { oneInchService } from './oneInchService'
import type { OneInchSwapApiInput, OneInchSwapResponse } from './types'

export type FetchOneInchSwapInput = {
  affiliateBps: string | undefined
  buyAsset: Asset
  receiveAddress: string
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  sellAsset: Asset
  maximumSlippageDecimalPercentage: string
}

export const fetchOneInchSwap = async ({
  affiliateBps,
  buyAsset,
  receiveAddress,
  sellAmountIncludingProtocolFeesCryptoBaseUnit,
  sellAsset,
  maximumSlippageDecimalPercentage,
}: FetchOneInchSwapInput) => {
  const apiUrl = getConfig().REACT_APP_ONE_INCH_API_URL

  // The maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
  // Note, we internally represent slippage as a decimal across the app (e.g., 0.01 for 1%)
  // so we need to multiply it by 100 when calling 1inch swap endpoint
  const maximumSlippagePercentage = bnOrZero(maximumSlippageDecimalPercentage).times(100).toNumber()

  const buyTokenPercentageFee = affiliateBps
    ? convertBasisPointsToPercentage(affiliateBps).toNumber()
    : 0

  const params: OneInchSwapApiInput = {
    fromTokenAddress: fromAssetId(sellAsset.assetId).assetReference,
    toTokenAddress: fromAssetId(buyAsset.assetId).assetReference,
    // HACK: use the receive address as the send address
    // 1inch uses this to check allowance on their side
    // this swapper is not cross-account so this works
    fromAddress: receiveAddress,
    amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    slippage: maximumSlippagePercentage,
    allowPartialFill: false,
    referrerAddress: getTreasuryAddressFromChainId(buyAsset.chainId),
    disableEstimate: false,
    fee: buyTokenPercentageFee,
  }

  const { chainReference } = fromChainId(sellAsset.chainId)
  const maybeSwapResponse = await oneInchService.get<OneInchSwapResponse>(
    `${apiUrl}/${chainReference}/swap`,
    { params },
  )

  if (maybeSwapResponse.isErr()) throw maybeSwapResponse.unwrapErr()
  const { data: swap } = maybeSwapResponse.unwrap()

  return swap
}
