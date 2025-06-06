import type { AssetId } from '@shapeshiftoss/caip'
import { bchAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn, fromBaseUnit, toBaseUnit } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import qs from 'qs'

import type { SwapErrorRight, SwapperDeps, SwapperName } from '../types'
import { TradeQuoteError } from '../types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from '../utils'
import { getThresholdedAffiliateBps } from './getThresholdedAffiliateBps/getThresholdedAffiliateBps'
import { getAffiliate, getDaemonUrl, getNativePrecision, getPoolAssetId } from './index'
import { thorService } from './service'
import type { ThornodeQuoteResponse, ThornodeQuoteResponseSuccess } from './types'

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

  // don't apply an affiliate fee if it's below the outbound fee for the inbound pool
  const thresholdedAffiliateBps = await getThresholdedAffiliateBps({
    sellAsset,
    sellAmountCryptoBaseUnit,
    affiliateBps,
    config: deps.config,
    swapperName,
  })

  const buyPoolId = getPoolAssetId({ assetId: buyAssetId, swapperName })
  const sellPoolId = getPoolAssetId({ assetId: sellAsset.assetId, swapperName })

  const sellAmountCryptoPrecision = fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset.precision)

  // All pool amounts are native precision regardless of token precision
  const sellAmountCryptoThorBaseUnit = bn(
    toBaseUnit(sellAmountCryptoPrecision, getNativePrecision(sellAsset.assetId, swapperName)),
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
    affiliate_bps: thresholdedAffiliateBps,
    affiliate: getAffiliate(swapperName),
    ...(streaming && { streaming_interval: streamingInterval }),
  })

  const daemonUrl = getDaemonUrl(deps.config, swapperName)
  const res = await thorService.get<ThornodeQuoteResponse>(`${daemonUrl}/quote/swap?${queryString}`)
  if (res.isErr()) return Err(res.unwrapErr())

  const { data } = res.unwrap()
  const isError = 'error' in data

  const notEnoughFeeError = isError && /not enough fee/i.test(data.error)
  const notEnoughToPayTxFeeError = isError && /not enough to pay transaction fee/i.test(data.error)
  const tradingIsHaltedError = isError && /trading is halted/.test(data.error)

  if (notEnoughFeeError || notEnoughToPayTxFeeError) return Err(createTradeAmountTooSmallErr())

  if (tradingIsHaltedError) {
    return Err(
      makeSwapErrorRight({
        message: `[getQuote]: Trading is halted, cannot process swap`,
        code: TradeQuoteError.TradingHalted,
        details: { sellAssetId: sellAsset.assetId, buyAssetId },
      }),
    )
  }

  if (isError) {
    return Err(
      makeSwapErrorRight({
        message: data.error,
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  return Ok(data)
}
