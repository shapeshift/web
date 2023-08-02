import { fromAssetId, fromChainId } from '@shapeshiftoss/caip'
import { getConfig } from 'config'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { convertBasisPointsToPercentage } from 'state/slices/tradeQuoteSlice/utils'

import { getTreasuryAddressFromChainId } from '../../utils/helpers/helpers'
import { DEFAULT_SLIPPAGE } from './constants'
import { oneInchService } from './oneInchService'
import type { OneInchSwapApiInput, OneInchSwapResponse } from './types'

export type FetchOneInchSwapInput = {
  affiliateBps: string | undefined
  buyAsset: Asset
  receiveAddress: string
  sellAmountBeforeFeesCryptoBaseUnit: string
  sellAsset: Asset
  maximumSlippageDecimalPercentage?: string
}

export const fetchOneInchSwap = async ({
  affiliateBps,
  buyAsset,
  receiveAddress,
  sellAmountBeforeFeesCryptoBaseUnit,
  sellAsset,
  maximumSlippageDecimalPercentage: slippage,
}: FetchOneInchSwapInput) => {
  const apiUrl = getConfig().REACT_APP_ONE_INCH_API_URL

  /**
   * limit of price slippage you are willing to accept in percentage,
   * may be set with decimals. &slippage=0.5 means 0.5% slippage is acceptable.
   * Low values increase chances that transaction will fail,
   * high values increase chances of front running. Set values in the range from 0 to 50
   */
  const maximumSlippagePercentage = (slippage ? bnOrZero(slippage) : bnOrZero(DEFAULT_SLIPPAGE))
    .times(100)
    .toNumber()

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
    amount: sellAmountBeforeFeesCryptoBaseUnit,
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
