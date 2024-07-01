import type { AssetId } from '@shapeshiftoss/caip'
import { bchAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { baseUnitToPrecision, bn, toBaseUnit } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import qs from 'qs'

import type { SwapperDeps } from '../../../../types'
import { type SwapErrorRight, TradeQuoteError } from '../../../../types'
import { createTradeAmountTooSmallErr, makeSwapErrorRight } from '../../../../utils'
import type { ThornodeQuoteResponse, ThornodeQuoteResponseSuccess } from '../../types'
import { THORCHAIN_AFFILIATE_NAME, THORCHAIN_FIXED_PRECISION } from '../constants'
import { getThresholdedAffiliateBps } from '../getThresholdedAffiliateBps/getThresholdedAffiliateBps'
import { assetIdToPoolAssetId } from '../poolAssetHelpers/poolAssetHelpers'
import { thorService } from '../thorService'

type GetQuoteArgs = {
  sellAsset: Asset
  buyAssetId: AssetId
  sellAmountCryptoBaseUnit: string
  // Receive address is optional for THOR quotes, and will be in case we are getting a quote with a missing manual receive address
  receiveAddress: string | undefined
  affiliateBps: string
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

const _getQuote = async (
  {
    sellAsset,
    buyAssetId,
    sellAmountCryptoBaseUnit,
    receiveAddress,
    streaming,
    affiliateBps,
    streamingInterval,
  }: GetQuoteArgs,
  deps: SwapperDeps,
): Promise<Result<ThornodeQuoteResponseSuccess, SwapErrorRight>> => {
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

  const daemonUrl = deps.config.REACT_APP_THORCHAIN_NODE_URL

  const queryString = qs.stringify({
    amount: sellAmountCryptoThorBaseUnit.toString(),
    from_asset: sellPoolId,
    to_asset: buyPoolId,
    destination: parsedReceiveAddress,
    affiliate_bps: affiliateBps,
    affiliate: THORCHAIN_AFFILIATE_NAME,
    ...(streaming && { streaming_interval: streamingInterval }),
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
    (/not enough fee/i.test(data.error) || /not enough to pay transaction fee/i.test(data.error))
  ) {
    return Err(createTradeAmountTooSmallErr())
  } else if (isError && /trading is halted/.test(data.error)) {
    return Err(
      makeSwapErrorRight({
        message: `[getTradeRate]: Trading is halted, cannot process swap`,
        code: TradeQuoteError.TradingHalted,
        details: { sellAssetId: sellAsset.assetId, buyAssetId },
      }),
    )
  } else if (isError) {
    return Err(
      makeSwapErrorRight({
        message: data.error,
        code: TradeQuoteError.UnknownError,
      }),
    )
  } else {
    return Ok(data)
  }
}

export const getQuote = async (
  input: GetQuoteArgs,
  deps: SwapperDeps,
): Promise<Result<ThornodeQuoteResponseSuccess, SwapErrorRight>> => {
  const { sellAsset, sellAmountCryptoBaseUnit, affiliateBps } = input

  // don't apply an affiliate fee if it's below the outbound fee for the inbound pool
  const thresholdedAffiliateBps = await getThresholdedAffiliateBps({
    sellAsset,
    sellAmountCryptoBaseUnit,
    affiliateBps,
    config: deps.config,
  })

  return _getQuote({ ...input, affiliateBps: thresholdedAffiliateBps }, deps)
}
