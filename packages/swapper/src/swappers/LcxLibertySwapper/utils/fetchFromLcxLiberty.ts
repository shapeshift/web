import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { getAddress, isAddress } from 'viem'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type {
  LcxLibertyBuildResponse,
  LcxLibertyQuote,
  LcxLibertyQuoteResponse,
  LcxLibertySwapTransaction,
} from '../types'
import type { LcxLibertySupportedChainId } from './constants'
import { LCX_LIBERTY_DEADLINE_SECONDS } from './constants'
import {
  convertAssetIdToLcxLibertyToken,
  getLcxLibertyChainReference,
  getLcxLibertyRequestError,
  validateLcxLibertyBuildResponse,
  validateLcxLibertyQuoteResponse,
} from './helpers'
import { lcxLibertyService } from './lcxLibertyService'

export const fetchLcxLibertyQuote = async ({
  chainId,
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  slippageBps,
  baseUrl,
}: {
  chainId: LcxLibertySupportedChainId
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  slippageBps: number
  baseUrl: string
}): Promise<Result<LcxLibertyQuote, SwapErrorRight>> => {
  const maybeResponse = await lcxLibertyService.post<LcxLibertyQuoteResponse>(`${baseUrl}/quote`, {
    chainId: getLcxLibertyChainReference(chainId),
    tokenIn: convertAssetIdToLcxLibertyToken(sellAsset.assetId),
    tokenOut: convertAssetIdToLcxLibertyToken(buyAsset.assetId),
    amountIn: sellAmountCryptoBaseUnit,
    slippageBps,
  })

  if (maybeResponse.isErr()) return Err(getLcxLibertyRequestError(maybeResponse.unwrapErr()))

  return validateLcxLibertyQuoteResponse(maybeResponse.unwrap().data, {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit,
    slippageBps,
  })
}

export const fetchLcxLibertySwap = async ({
  quote,
  chainId,
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  receiveAddress,
  baseUrl,
}: {
  quote: LcxLibertyQuote
  chainId: LcxLibertySupportedChainId
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  receiveAddress: string
  baseUrl: string
}): Promise<
  Result<{ transaction: LcxLibertySwapTransaction; deadlineSeconds: number }, SwapErrorRight>
> => {
  if (!isAddress(receiveAddress, { strict: false })) {
    return Err(
      makeSwapErrorRight({
        message: 'LCX Liberty DEX needs an EVM receive address',
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const recipient = getAddress(receiveAddress)

  const maybeResponse = await lcxLibertyService.post<LcxLibertyBuildResponse>(`${baseUrl}/build`, {
    quoteId: quote.quoteId,
    recipient,
    deadlineSecs: LCX_LIBERTY_DEADLINE_SECONDS,
  })

  if (maybeResponse.isErr()) return Err(getLcxLibertyRequestError(maybeResponse.unwrapErr()))

  return validateLcxLibertyBuildResponse(maybeResponse.unwrap().data, {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit,
    receiveAddress: recipient,
    minimumBuyAmountCryptoBaseUnit: quote.output.minimumAmount,
  })
}
