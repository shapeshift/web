import type { AssetId } from '@shapeshiftoss/caip'
import { bchAssetId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getConfig } from 'config'
import qs from 'qs'
import type { Asset } from 'lib/asset-service'
import { baseUnitToPrecision, bn } from 'lib/bignumber/bignumber'
import { toBaseUnit } from 'lib/math'
import type {
  ThornodePoolResponse,
  ThornodeQuoteResponse,
  ThornodeQuoteResponseSuccess,
} from 'lib/swapper/swappers/ThorchainSwapper/types'
import {
  DEFAULT_STREAMING_INTERVAL,
  THORCHAIN_AFFILIATE_NAME,
  THORCHAIN_FIXED_PRECISION,
} from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import type { SwapErrorRight } from 'lib/swapper/types'
import { SwapErrorType } from 'lib/swapper/types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from 'lib/swapper/utils'

import { getThresholdedAffiliateBps } from '../getThresholdedAffiliateBps/getThresholdedAffiliateBps'
import { thorService } from '../thorService'

type GetQuoteArgs = {
  sellAsset: Asset
  buyAssetId: AssetId
  sellAmountCryptoBaseUnit: string
  // Receive address is optional for THOR quotes, and will be in case we are getting a quote with a missing manual receive address
  receiveAddress: string | undefined
  streaming: boolean
  affiliateBps: string
}

const _getQuote = async ({
  sellAsset,
  buyAssetId,
  sellAmountCryptoBaseUnit,
  receiveAddress,
  streaming,
  affiliateBps,
}: GetQuoteArgs): Promise<Result<ThornodeQuoteResponseSuccess, SwapErrorRight>> => {
  const buyPoolId = assetIdToPoolAssetId({ assetId: buyAssetId })
  const sellPoolId = assetIdToPoolAssetId({ assetId: sellAsset.assetId })

  const sellAmountCryptoPrecision = baseUnitToPrecision({
    value: sellAmountCryptoBaseUnit,
    inputExponent: sellAsset.precision,
  })
  // All THORChain pool amounts are base 8 regardless of token precision
  const sellAmountCryptoThorBaseUnit = bn(
    toBaseUnit(sellAmountCryptoPrecision, THORCHAIN_FIXED_PRECISION),
  )

  // The THORChain swap endpoint expects BCH receiveAddress's to be stripped of the "bitcoincash:" prefix
  const parsedReceiveAddress =
    receiveAddress && buyAssetId === bchAssetId
      ? receiveAddress.replace('bitcoincash:', '')
      : receiveAddress

  const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
  const maybePoolsResponse = await thorService.get<ThornodePoolResponse[]>(
    `${daemonUrl}/lcd/thorchain/pools`,
  )

  if (maybePoolsResponse.isErr()) return Err(maybePoolsResponse.unwrapErr())

  const { data: poolsResponse } = maybePoolsResponse.unwrap()

  const sellAssetPool = poolsResponse.find(pool => pool.asset === sellPoolId)
  const buyAssetPool = poolsResponse.find(pool => pool.asset === buyPoolId)

  if (!sellAssetPool)
    return Err(
      makeSwapErrorRight({
        message: `[_getQuote]: Pool not found for sell asset ${sellAsset.assetId}`,
        code: SwapErrorType.POOL_NOT_FOUND,
        details: { sellAssetId: sellAsset.assetId, buyAssetId },
      }),
    )

  if (!buyAssetPool)
    return Err(
      makeSwapErrorRight({
        message: `[_getQuote]: Pool not found for buy asset ${buyAssetId}`,
        code: SwapErrorType.POOL_NOT_FOUND,
        details: { sellAssetId: sellAsset.assetId, buyAssetId },
      }),
    )

  const sellAssetDepthBps = sellAssetPool.derived_depth_bps
  const buyAssetDepthBps = buyAssetPool.derived_depth_bps
  const swapDepthBps = bn(sellAssetDepthBps).plus(buyAssetDepthBps).div(2)

  const streamingInterval = (() => {
    // Low health for the pools of this swap - use a longer streaming interval
    if (swapDepthBps.lt(5000)) return 10
    if (swapDepthBps.lt(9000) && swapDepthBps.gte(5000)) return 5
    return 1
  })()

  console.log({ streamingInterval })

  const queryString = qs.stringify({
    amount: sellAmountCryptoThorBaseUnit.toString(),
    from_asset: sellPoolId,
    to_asset: buyPoolId,
    destination: parsedReceiveAddress,
    affiliate_bps: affiliateBps,
    affiliate: THORCHAIN_AFFILIATE_NAME,
    ...(streaming && { streaming_interval: DEFAULT_STREAMING_INTERVAL }),
  })
  const maybeData = (
    await thorService.get<ThornodeQuoteResponse>(
      `${daemonUrl}/lcd/thorchain/quote/swap?${queryString}`,
    )
  ).andThen(({ data }) => Ok(data))

  if (maybeData.isErr()) return Err(maybeData.unwrapErr())
  const data = maybeData.unwrap()
  const isError = 'error' in data

  if (
    isError &&
    (/not enough fee/.test(data.error) || /not enough to pay transaction fee/.test(data.error))
  ) {
    return Err(createTradeAmountTooSmallErr())
  } else if (isError && /trading is halted/.test(data.error)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeRate]: Trading is halted, cannot process swap`,
        code: SwapErrorType.TRADING_HALTED,
        details: { sellAssetId: sellAsset.assetId, buyAssetId },
      }),
    )
  } else if (isError) {
    return Err(
      makeSwapErrorRight({
        message: data.error,
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  } else {
    return Ok(data)
  }
}

export const getQuote = async (
  input: GetQuoteArgs,
): Promise<Result<ThornodeQuoteResponseSuccess, SwapErrorRight>> => {
  const { sellAsset, sellAmountCryptoBaseUnit, affiliateBps } = input

  // don't apply an affiliate fee if it's below the outbound fee for the inbound pool
  const thresholdedAffiliateBps = await getThresholdedAffiliateBps({
    sellAsset,
    sellAmountCryptoBaseUnit,
    affiliateBps,
  })

  return _getQuote({ ...input, affiliateBps: thresholdedAffiliateBps })
}
