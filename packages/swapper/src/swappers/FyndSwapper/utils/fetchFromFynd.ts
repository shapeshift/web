import type { Asset } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { isAddress, zeroAddress } from 'viem'

import type { EvmChainId, SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { FyndEncodedQuote } from '../types'
import { FYND_CHAINS } from './constants'
import { createFyndService } from './fyndService'
import {
  assertValidTrade,
  convertAssetIdToFyndToken,
  getFyndClientFeeBps,
  getFyndRequestError,
  isFyndNativeAsset,
} from './helpers'
import { isFyndAmount, validateFyndQuoteResponse } from './validation'

type FetchFyndInput = {
  sellAsset: Asset
  buyAsset: Asset
  chainId: EvmChainId
  sellAmountCryptoBaseUnit: string
  sender: string
  receiver: string
  slippageTolerancePercentageDecimal: string
  affiliateBps: string
  baseUrl: string
}

export const fetchFromFynd = async ({
  sellAsset,
  buyAsset,
  chainId: requestedChainId,
  sellAmountCryptoBaseUnit,
  sender,
  receiver,
  slippageTolerancePercentageDecimal,
  affiliateBps,
  baseUrl,
}: FetchFyndInput): Promise<Result<FyndEncodedQuote, SwapErrorRight>> => {
  if (!baseUrl) {
    return Err(
      makeSwapErrorRight({
        message: 'Fynd base URL is not configured',
        code: TradeQuoteError.InternalError,
      }),
    )
  }
  const maybeTrade = assertValidTrade({ sellAsset, buyAsset, chainId: requestedChainId })
  if (maybeTrade.isErr()) return Err(maybeTrade.unwrapErr())
  const chainId = maybeTrade.unwrap()
  if (
    !isFyndAmount(sellAmountCryptoBaseUnit) ||
    !bn(sellAmountCryptoBaseUnit).gt(0) ||
    !isAddress(sender) ||
    !isAddress(receiver) ||
    sender.toLowerCase() === zeroAddress ||
    receiver.toLowerCase() === zeroAddress ||
    !/^0(?:\.\d+)?$/.test(slippageTolerancePercentageDecimal)
  ) {
    return Err(
      makeSwapErrorRight({
        message: 'Invalid Fynd amount, address or slippage',
        code: TradeQuoteError.InternalError,
      }),
    )
  }
  const clientFeeBps = getFyndClientFeeBps(affiliateBps)
  const service = createFyndService({
    baseUrl: `${baseUrl.replace(/\/$/, '')}/${FYND_CHAINS[chainId].name}`,
  })
  const maybeResponse = await service.post<unknown>('/quote', {
    orders: [
      {
        token_in: convertAssetIdToFyndToken(sellAsset.assetId),
        token_out: convertAssetIdToFyndToken(buyAsset.assetId),
        amount: sellAmountCryptoBaseUnit,
        side: 'sell',
        sender,
        receiver,
      },
    ],
    options: {
      timeout_ms: 5_000,
      min_responses: 1,
      // The deployed API accepts a string despite its OpenAPI schema declaring a number.
      // The proxy sets the fee receiver and deadline and signs the quote
      encoding_options: {
        slippage: slippageTolerancePercentageDecimal,
        transfer_type: 'transfer_from',
        ...(clientFeeBps > 0 ? { client_fee_params: { bps: clientFeeBps } } : {}),
      },
    },
  })
  if (maybeResponse.isErr()) return Err(getFyndRequestError(maybeResponse.unwrapErr()))
  return validateFyndQuoteResponse(maybeResponse.unwrap().data, {
    chainId,
    sellAmountCryptoBaseUnit,
    isNativeSell: isFyndNativeAsset(sellAsset.assetId),
    slippageTolerancePercentageDecimal,
    clientFeeBps,
  })
}
