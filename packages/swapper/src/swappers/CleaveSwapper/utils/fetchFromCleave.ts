import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import type {
  CleaveExecutableQuote,
  CleaveQuoteResponse,
  CleaveTradeQuoteInput,
  CleaveTradeRateInput,
} from '../types'
import { cleaveService } from './cleaveService'
import type { CleaveSupportedChainId } from './constants'
import {
  convertAssetIdToCleaveToken,
  getCleaveRequestError,
  validateCleaveQuoteResponse,
} from './helpers'

export const fetchFromCleave = async ({
  input,
  chainId,
  recipient,
  deadline,
  slippageBps,
  referralBps,
  referrer,
  baseUrl,
}: {
  input: CleaveTradeQuoteInput | CleaveTradeRateInput
  chainId: CleaveSupportedChainId
  recipient: string
  deadline: number
  slippageBps: number
  referralBps: number
  referrer: string
  baseUrl: string
}): Promise<Result<CleaveExecutableQuote, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  const maybeResponse = await cleaveService.get<CleaveQuoteResponse>(
    `${baseUrl}/partner/v1/quote`,
    {
      params: {
        chainId: fromChainId(chainId).chainReference,
        tokenIn: convertAssetIdToCleaveToken(sellAsset.assetId),
        tokenOut: convertAssetIdToCleaveToken(buyAsset.assetId),
        amountIn: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        slippageBps,
        recipient,
        deadline,
        ...(referralBps > 0 ? { referralBps, referralRecipient: referrer } : {}),
      },
    },
  )

  if (maybeResponse.isErr()) return Err(getCleaveRequestError(maybeResponse.unwrapErr()))

  return validateCleaveQuoteResponse(maybeResponse.unwrap().data, {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    recipient,
    deadline,
    slippageBps,
    referralBps,
    referrer,
  })
}
