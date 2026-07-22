import type { AssetId } from '@shapeshiftoss/caip'
import { bchAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { BigAmount, bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import type { AxiosError } from 'axios'
import qs from 'qs'

import type { SwapErrorRight, SwapperDeps, SwapperName } from '../types'
import { TradeQuoteError } from '../types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from '../utils'
import { getAffiliate, getDaemonUrl, getNativePrecision, getPoolAssetId } from './index'
import { thorService } from './service'
import type {
  ThornodeQuoteResponse,
  ThornodeQuoteResponseSuccess,
  ThornodeResponseError,
} from './types'

type GetQuoteArgs = {
  sellAsset: Asset
  buyAssetId: AssetId
  sellAmountCryptoBaseUnit: string
  // Receive address is optional for quotes, and will be in case we are getting a quote with a missing manual receive address
  receiveAddress: string | undefined
  affiliateBps: string
  swapperName: SwapperName
} & (
  | {
      streaming: true
      streamingInterval: number
    }
  | {
      streaming?: false
      streamingInterval?: never
    }
)

export const getQuote = async (
  input: GetQuoteArgs,
  deps: SwapperDeps,
): Promise<Result<ThornodeQuoteResponseSuccess, SwapErrorRight>> => {
  const {
    buyAssetId,
    receiveAddress,
    sellAsset,
    sellAmountCryptoBaseUnit,
    streaming,
    streamingInterval,
    affiliateBps,
    swapperName,
  } = input

  const buyPoolId = getPoolAssetId({ assetId: buyAssetId, swapperName })
  const sellPoolId = getPoolAssetId({ assetId: sellAsset.assetId, swapperName })

  const sellAmountCryptoPrecision = BigAmount.fromBaseUnit({
    value: sellAmountCryptoBaseUnit,
    precision: sellAsset.precision,
  }).toPrecision()

  // All pool amounts are native precision regardless of token precision
  const sellAmountCryptoThorBaseUnit = bn(
    BigAmount.fromPrecision({
      value: sellAmountCryptoPrecision,
      precision: getNativePrecision(sellAsset.assetId, swapperName),
    }).toBaseUnit(),
  )

  // The swap endpoint expects BCH receiveAddress's to be stripped of the "bitcoincash:" prefix
  const parsedReceiveAddress =
    receiveAddress && buyAssetId === bchAssetId
      ? receiveAddress.replace('bitcoincash:', '')
      : receiveAddress

  const queryString = qs.stringify({
    amount: sellAmountCryptoThorBaseUnit.toString(),
    from_asset: sellPoolId,
    to_asset: buyPoolId,
    destination: parsedReceiveAddress,
    affiliate_bps: affiliateBps,
    affiliate: getAffiliate(swapperName),
    ...(streaming && { streaming_interval: streamingInterval }),
  })

  const daemonUrl = getDaemonUrl(deps.config, swapperName)
  const res = await thorService.get<ThornodeQuoteResponse>(`${daemonUrl}/quote/swap?${queryString}`)

  // Thornode returns errors as `{ error: string }` in both the 2xx body and the 4xx body.
  // On 4xx axios rejects, so the body lands on `cause.response.data` instead of in the success data.
  const errorMessage: string | undefined = (() => {
    if (res.isErr()) {
      const cause = res.unwrapErr().cause as AxiosError<ThornodeResponseError> | undefined
      return cause?.response?.data?.error
    }
    const { data } = res.unwrap()
    return 'error' in data ? data.error : undefined
  })()

  if (errorMessage) {
    if (
      /not enough fee/i.test(errorMessage) ||
      /not enough to pay transaction fee/i.test(errorMessage)
    ) {
      return Err(createTradeAmountTooSmallErr())
    }

    if (/trading is halted/i.test(errorMessage)) {
      return Err(
        makeSwapErrorRight({
          message: `[getQuote]: Trading is halted, cannot process swap`,
          code: TradeQuoteError.TradingHalted,
          details: { sellAssetId: sellAsset.assetId, buyAssetId },
        }),
      )
    }

    return Err(
      makeSwapErrorRight({
        message: errorMessage,
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  if (res.isErr()) return Err(res.unwrapErr())

  return Ok(res.unwrap().data as ThornodeQuoteResponseSuccess)
}
