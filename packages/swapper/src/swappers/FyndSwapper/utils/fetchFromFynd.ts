import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { SwapErrorRight } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { FyndInfoResponse, FyndOrderQuote, FyndQuoteResponse } from '../types'
import { fyndServiceFactory } from './fyndService'
import { assetIdToFyndToken } from './helpers'

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

const quoteStatusToError = (status: FyndOrderQuote['status']) => {
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
  const service = fyndServiceFactory({ baseUrl })
  const maybeInfo = await service.get<FyndInfoResponse>('/info')
  if (maybeInfo.isErr()) return Err(maybeInfo.unwrapErr())

  const { router_address: routerAddress } = maybeInfo.unwrap().data
  if (!routerAddress) {
    return Err(
      makeSwapErrorRight({
        message: 'Fynd router is unavailable for this chain',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }

  const maybeResponse = await service.post<FyndQuoteResponse>('/quote', {
    orders: [
      {
        token_in: assetIdToFyndToken(sellAsset.assetId),
        token_out: assetIdToFyndToken(buyAsset.assetId),
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
  const quote = maybeResponse.unwrap().data.orders[0]
  if (!quote) {
    return Err(
      makeSwapErrorRight({
        message: 'Fynd returned no order quote',
        code: TradeQuoteError.InvalidResponse,
      }),
    )
  }
  if (quote.status !== 'success') return Err(quoteStatusToError(quote.status))

  return Ok({ quote, routerAddress })
}
