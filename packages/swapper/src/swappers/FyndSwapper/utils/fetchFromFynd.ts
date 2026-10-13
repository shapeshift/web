import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import type {
  FyndEncodedQuote,
  FyndQuoteResponse,
  FyndTradeQuoteInput,
  FyndTradeRateInput,
} from '../types'
import type { FyndSupportedChainId } from './constants'
import { FYND_CHAINS } from './constants'
import { fyndService } from './fyndService'
import {
  convertAssetIdToFyndToken,
  getFyndRequestError,
  validateFyndQuoteResponse,
} from './helpers'

export const fetchFromFynd = async ({
  input,
  chainId,
  sender,
  receiver,
  slippageTolerancePercentageDecimal,
  clientFeeBps,
  baseUrl,
}: {
  input: FyndTradeQuoteInput | FyndTradeRateInput
  chainId: FyndSupportedChainId
  sender: string
  receiver: string
  slippageTolerancePercentageDecimal: string
  clientFeeBps: number
  baseUrl: string
}): Promise<Result<FyndEncodedQuote, SwapErrorRight>> => {
  const { sellAsset, buyAsset, sellAmountIncludingProtocolFeesCryptoBaseUnit } = input

  const maybeResponse = await fyndService.post<FyndQuoteResponse>(
    `${baseUrl}/${FYND_CHAINS[chainId].name}/quote`,
    {
      orders: [
        {
          token_in: convertAssetIdToFyndToken(sellAsset.assetId),
          token_out: convertAssetIdToFyndToken(buyAsset.assetId),
          amount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          side: 'sell',
          sender,
          receiver,
        },
      ],
      options: {
        timeout_ms: 5_000,
        min_responses: 1,
        encoding_options: {
          // The API accepts a string slippage despite its schema declaring a number
          slippage: slippageTolerancePercentageDecimal,
          transfer_type: 'transfer_from',
          // The proxy sets the fee receiver and deadline and signs the quote
          ...(clientFeeBps > 0 ? { client_fee_params: { bps: clientFeeBps } } : {}),
        },
      },
    },
  )

  if (maybeResponse.isErr()) return Err(getFyndRequestError(maybeResponse.unwrapErr()))

  return validateFyndQuoteResponse(maybeResponse.unwrap().data, {
    chainId,
    sellAsset,
    sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    slippageTolerancePercentageDecimal,
    clientFeeBps,
  })
}
