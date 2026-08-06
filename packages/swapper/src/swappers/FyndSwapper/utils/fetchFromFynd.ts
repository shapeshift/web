import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { FyndInfoResponse, FyndOrderQuote, FyndQuoteResponse } from '../types'
import { createFyndService } from './fyndService'
import { convertAssetIdToFyndToken } from './helpers'
import { validateFyndInfoResponse, validateFyndQuoteResponse } from './validation'

type FetchFyndInput = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountCryptoBaseUnit: string
  sender: string
  receiver: string
  slippageTolerancePercentageDecimal: string
  baseUrl: string
  quoteOrRate: 'quote' | 'rate'
}

const quoteStatusToError = (status: FyndOrderQuote['status']): SwapErrorRight => {
  const code =
    status === 'no_route_found' || status === 'insufficient_liquidity'
      ? TradeQuoteError.NoRouteFound
      : TradeQuoteError.QueryFailed
  return makeSwapErrorRight({ message: `Fynd quote failed with status ${status}`, code })
}

export const fetchFromFynd = async ({
  sellAsset,
  buyAsset,
  sellAmountCryptoBaseUnit,
  sender,
  receiver,
  slippageTolerancePercentageDecimal,
  baseUrl,
  quoteOrRate,
}: FetchFyndInput): Promise<
  Result<{ quote: FyndOrderQuote; routerAddress: string }, SwapErrorRight>
> => {
  const service = createFyndService({ baseUrl })
  const maybeInfo = await service.get<FyndInfoResponse>('/info')
  if (maybeInfo.isErr()) return Err(maybeInfo.unwrapErr())

  const maybeValidInfo = validateFyndInfoResponse(maybeInfo.unwrap().data)
  if (maybeValidInfo.isErr()) return Err(maybeValidInfo.unwrapErr())
  const { router_address: routerAddress } = maybeValidInfo.unwrap()

  const maybeResponse = await service.post<FyndQuoteResponse>('/quote', {
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
      ...(quoteOrRate === 'quote' && {
        encoding_options: {
          slippage: Number(slippageTolerancePercentageDecimal),
          transfer_type: 'transfer_from',
        },
      }),
    },
  })

  if (maybeResponse.isErr()) return Err(maybeResponse.unwrapErr())
  const maybeValidResponse = validateFyndQuoteResponse(maybeResponse.unwrap().data, quoteOrRate)
  if (maybeValidResponse.isErr()) return Err(maybeValidResponse.unwrapErr())
  const quote = maybeValidResponse.unwrap().orders[0]
  if (quote.status !== 'success') return Err(quoteStatusToError(quote.status))

  return Ok({ quote, routerAddress })
}
