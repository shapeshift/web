import { type AccountId, type AssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { reactQueries } from 'react-queries'
import { queryClient } from 'context/QueryClientProvider/queryClient'
import { type BN, bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { MidgardPoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'

import { fromThorBaseUnit } from '.'
import type {
  AsymSide,
  MidgardPoolStats,
  MidgardSwapHistoryResponse,
  MidgardTvlHistoryResponse,
  PoolShareDetail,
  ThorchainEarningsHistoryResponse,
  ThorchainLiquidityProvidersResponseSuccess,
} from './lp/types'

const midgardUrl = getConfig().REACT_APP_MIDGARD_URL

export const getAllThorchainLiquidityProviderPositions = async (
  assetId: AssetId,
): Promise<ThorchainLiquidityProvidersResponseSuccess> => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })

  if (!poolAssetId) throw new Error(`Pool asset not found for assetId ${assetId}`)

  const { data } = await axios.get<ThorchainLiquidityProvidersResponseSuccess>(
    `${
      getConfig().REACT_APP_THORCHAIN_NODE_URL
    }/lcd/thorchain/pool/${poolAssetId}/liquidity_providers`,
  )

  if (!data || 'error' in data) return []

  return data
}

export const calculateTVL = (
  assetDepthCryptoBaseUnit: string,
  runeDepthCryptoBaseUnit: string,
  runePrice: string,
): { tvl: string; assetAmountCrytoPrecision: string; runeAmountCryptoPrecision: string } => {
  const assetDepthCryptoPrecision = fromThorBaseUnit(assetDepthCryptoBaseUnit)
  const runeDepthCryptoPrecision = fromThorBaseUnit(runeDepthCryptoBaseUnit)

  const assetValueFiatUserCurrency = assetDepthCryptoPrecision.times(runePrice)
  const runeValueFiatUserCurrency = runeDepthCryptoPrecision.times(runePrice)

  const tvl = assetValueFiatUserCurrency.plus(runeValueFiatUserCurrency).times(2)

  const result = {
    tvl: tvl.toFixed(),
    assetAmountCrytoPrecision: assetDepthCryptoPrecision.toFixed(),
    runeAmountCryptoPrecision: runeDepthCryptoPrecision.toFixed(),
  }

  return result
}

export const getVolume = (
  runePrice: string,
  swapHistoryResponse: MidgardSwapHistoryResponse,
): string => {
  const volume = swapHistoryResponse.meta.totalVolume

  return fromThorBaseUnit(volume).times(runePrice).toFixed()
}

export const get24hSwapChangePercentage = (
  runePrice: string,
  assetPrice: string,
  current24hData: MidgardSwapHistoryResponse,
  previous24hData: MidgardSwapHistoryResponse,
): { volumeChangePercentage: number; feeChangePercentage: number } | null => {
  // Get previous 24h fees
  const previousToAssetFeesCryptoPrecision = fromThorBaseUnit(previous24hData.meta.toAssetFees)
  const previousToRuneFeesCryptoPrecision = fromThorBaseUnit(previous24hData.meta.toRuneFees)
  const previousToAssetFeesFiatUserCurrency = previousToAssetFeesCryptoPrecision.times(assetPrice)
  const previousToRuneFeesFiatUserCurrency = previousToRuneFeesCryptoPrecision.times(runePrice)
  const previousFeesFiatUserCurrency = previousToAssetFeesFiatUserCurrency.plus(
    previousToRuneFeesFiatUserCurrency,
  )

  // Get current 24h fees
  const currentToAssetFeesCryptoPrecision = fromThorBaseUnit(current24hData.meta.toAssetFees)
  const currentToRuneFeesCryptoPrecision = fromThorBaseUnit(current24hData.meta.toRuneFees)
  const currentToAssetFeesFiatUserCurrency = currentToAssetFeesCryptoPrecision.times(assetPrice)
  const currentToRuneFeesFiatUserCurrency = currentToRuneFeesCryptoPrecision.times(runePrice)
  const currentFeesFiatUserCurrency = currentToAssetFeesFiatUserCurrency.plus(
    currentToRuneFeesFiatUserCurrency,
  )

  const feeChange = currentFeesFiatUserCurrency.minus(previousFeesFiatUserCurrency)
  const feeChangePercentage = previousFeesFiatUserCurrency.isZero()
    ? 0
    : feeChange.div(previousFeesFiatUserCurrency).toNumber()

  const previousVolume = bnOrZero(previous24hData.meta.totalVolume)
  const currentVolume = current24hData.meta.totalVolume

  const volumeChange = bnOrZero(currentVolume).minus(previousVolume)
  const volumeChangePercentage = previousVolume.isZero()
    ? 0
    : volumeChange.div(previousVolume).toNumber()

  return {
    volumeChangePercentage,
    feeChangePercentage,
  }
}

export const get24hTvlChangePercentage = async (assetId: AssetId): Promise<number | null> => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })
  const now = Math.floor(Date.now() / 1000)
  const twentyFourHoursAgo = now - 24 * 60 * 60
  const fortyEightHoursAgo = now - 2 * 24 * 60 * 60

  const { data: current24hData } = await axios.get<MidgardTvlHistoryResponse>(
    `${getConfig().REACT_APP_MIDGARD_URL}/history/tvl?from=${twentyFourHoursAgo}&to=${now}`,
  )

  const currentPool24hDepth = current24hData.meta.poolsDepth.find(pool => pool.pool === poolAssetId)
    ?.totalDepth

  const { data: previous24hData } = await axios.get<MidgardTvlHistoryResponse>(
    `${
      getConfig().REACT_APP_MIDGARD_URL
    }/history/tvl?from=${fortyEightHoursAgo}&to=${twentyFourHoursAgo}`,
  )

  const previousPool24hDepth = bnOrZero(
    previous24hData.meta.poolsDepth.find(pool => pool.pool === poolAssetId)?.totalDepth,
  )

  const change =
    currentPool24hDepth !== undefined && previousPool24hDepth !== undefined
      ? bnOrZero(currentPool24hDepth).minus(previousPool24hDepth)
      : bn(0)
  return previousPool24hDepth.isZero() ? 0 : change.div(previousPool24hDepth).toNumber()
}

// Does pretty much what it says on the box. Uses the user and pool data to calculate the user's *current* value in both ROON and asset
export const getCurrentValue = (
  liquidityUnits: string,
  poolUnits: string,
  assetDepth: string,
  runeDepth: string,
): { rune: string; asset: string; poolShare: string } => {
  const liquidityUnitsCryptoPrecision = fromThorBaseUnit(liquidityUnits)
  const poolUnitsCryptoPrecision = fromThorBaseUnit(poolUnits)
  const assetDepthCryptoPrecision = fromThorBaseUnit(assetDepth)
  const runeDepthCryptoPrecision = fromThorBaseUnit(runeDepth)

  const poolShare = liquidityUnitsCryptoPrecision.div(poolUnitsCryptoPrecision)
  const redeemableRune = poolShare.times(runeDepthCryptoPrecision).toFixed()
  const redeemableAsset = poolShare.times(assetDepthCryptoPrecision).toFixed()

  return {
    rune: redeemableRune,
    asset: redeemableAsset,
    poolShare: poolShare.toFixed(),
  }
}

export const getFees = (
  runePrice: string,
  assetPrice: string,
  swapHistoryResponse: MidgardSwapHistoryResponse,
): string => {
  const currentToAssetFeesCryptoPrecision = fromThorBaseUnit(swapHistoryResponse.meta.toAssetFees)
  const currentToRuneFeesCryptoPrecision = fromThorBaseUnit(swapHistoryResponse.meta.toRuneFees)
  const currentToAssetFeesFiatUserCurrency = currentToAssetFeesCryptoPrecision.times(assetPrice)
  const currentToRuneFeesFiatUserCurrency = currentToRuneFeesCryptoPrecision.times(runePrice)
  const currentFeesFiatUserCurrency = currentToAssetFeesFiatUserCurrency.plus(
    currentToRuneFeesFiatUserCurrency,
  )

  return currentFeesFiatUserCurrency.toFixed()
}

export const getAllTimeVolume = async (assetId: AssetId, runePrice: string): Promise<string> => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })

  const { data } = await axios.get<MidgardPoolStats>(
    `${getConfig().REACT_APP_MIDGARD_URL}/pool/${poolAssetId}/stats?period=all`,
  )

  const swapVolume = fromThorBaseUnit(data?.swapVolume ?? '0')
  const totalVolume = swapVolume

  const totalVolumeFiatUserCurrency = totalVolume.times(runePrice)

  return totalVolumeFiatUserCurrency.toFixed()
}

// https://dev.thorchain.org/concepts/math.html#lp-units-add
export const getLiquidityUnits = ({
  pool,
  assetAmountCryptoThorPrecision,
  runeAmountCryptoThorPrecision,
}: {
  pool: MidgardPoolResponse
  assetAmountCryptoThorPrecision: string
  runeAmountCryptoThorPrecision: string
}): BN => {
  const P = pool.liquidityUnits
  const a = assetAmountCryptoThorPrecision
  const r = runeAmountCryptoThorPrecision
  const R = pool.runeDepth
  const A = pool.assetDepth
  const part1 = bnOrZero(R).times(a)
  const part2 = bnOrZero(r).times(A)

  const numerator = bnOrZero(P).times(part1.plus(part2))
  const denominator = bnOrZero(R).times(A).times(2)
  const result = numerator.div(denominator)
  return result
}

export const getPoolShare = (liquidityUnits: BN, pool: MidgardPoolResponse): PoolShareDetail => {
  // formula: (rune * part) / total; (asset * part) / total
  const units = liquidityUnits
  const total = pool.liquidityUnits
  const R = pool.runeDepth
  const T = pool.assetDepth
  const asset = bnOrZero(T).times(units).div(total)
  const rune = bnOrZero(R).times(units).div(total)
  return {
    assetShare: asset,
    runeShare: rune,
    poolShareDecimalPercent: liquidityUnits.div(liquidityUnits.plus(pool.liquidityUnits)).toFixed(),
  }
}

// https://dev.thorchain.org/concepts/math.html#slippage
export const getSlipOnLiquidity = ({
  runeAmountCryptoThorPrecision,
  assetAmountCryptoThorPrecision,
  pool,
}: {
  runeAmountCryptoThorPrecision: string
  assetAmountCryptoThorPrecision: string
  pool: MidgardPoolResponse
}): BN => {
  // formula: (t * R - T * r)/ (T*r + R*T)
  const r = runeAmountCryptoThorPrecision
  const t = assetAmountCryptoThorPrecision
  const R = pool.runeDepth
  const T = pool.assetDepth
  const numerator = bnOrZero(t).times(R).minus(bnOrZero(T).times(r))
  const denominator = bnOrZero(T).times(r).plus(bnOrZero(R).times(T))
  const result = numerator.div(denominator).abs()
  return result
}

// Estimates a liquidity position for given crypto amount value, both asymmetrical and symetrical
// https://dev.thorchain.org/concepts/math.html#lp-units-add
export const estimateAddThorchainLiquidityPosition = async ({
  runeAmountCryptoThorPrecision,
  assetId,
  assetAmountCryptoThorPrecision,
}: {
  runeAmountCryptoThorPrecision: string
  assetId: AssetId
  assetAmountCryptoThorPrecision: string
}) => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })
  const poolResult = await thorService.get<MidgardPoolResponse>(`${midgardUrl}/pool/${poolAssetId}`)
  if (poolResult.isErr()) throw poolResult.unwrapErr()
  const pool = poolResult.unwrap().data
  const liquidityUnitsCryptoThorPrecision = getLiquidityUnits({
    pool,
    assetAmountCryptoThorPrecision,
    runeAmountCryptoThorPrecision,
  })
  const poolShare = getPoolShare(liquidityUnitsCryptoThorPrecision, pool)

  const assetInboundFee = bn(0) // TODO
  const runeInboundFee = bn(0) // TODO
  const totalFees = assetInboundFee.plus(runeInboundFee)

  const slip = getSlipOnLiquidity({
    runeAmountCryptoThorPrecision,
    assetAmountCryptoThorPrecision,
    pool,
  })

  return {
    assetPool: pool.asset,
    slipPercent: slip.times(100).toFixed(),
    poolShareAsset: poolShare.assetShare.toFixed(),
    poolShareRune: poolShare.runeShare.toFixed(),
    poolShareDecimalPercent: poolShare.poolShareDecimalPercent,
    liquidityUnits: liquidityUnitsCryptoThorPrecision.toFixed(),
    inbound: {
      fees: {
        asset: assetInboundFee.toFixed(),
        rune: runeInboundFee.toFixed(),
        total: totalFees.toFixed(),
      },
    },
  }
}

// TODO: add 'percentage' param
// https://dev.thorchain.org/concepts/math.html#lp-units-withdrawn
export const estimateRemoveThorchainLiquidityPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId
  assetId: AssetId
  assetAmountCryptoThorPrecision: string
  asymSide: AsymSide | null
}) => {
  const lpPositions = await queryClient.fetchQuery(
    reactQueries.thorchainLp.liquidityProviderPosition({ accountId, assetId }),
  )
  const poolAssetId = assetIdToPoolAssetId({ assetId })
  // TODO: this is wrong. Expose selectLiquidityPositionsData from useUserLpData , consume this instead of getThorchainLiquidityProviderPosition
  // and get the right position for the user depending on the asymSide
  const lpPosition = lpPositions?.[0]
  const liquidityUnitsCryptoThorPrecision = lpPosition?.liquidityUnits
  const poolResult = await thorService.get<MidgardPoolResponse>(`${midgardUrl}/pool/${poolAssetId}`)
  if (poolResult.isErr()) throw poolResult.unwrapErr()
  const pool = poolResult.unwrap().data
  const poolShare = getPoolShare(bnOrZero(liquidityUnitsCryptoThorPrecision), pool)
  const slip = getSlipOnLiquidity({
    runeAmountCryptoThorPrecision: poolShare.runeShare.toString(),
    assetAmountCryptoThorPrecision: poolShare.assetShare.toString(),
    pool,
  })

  const assetInboundFee = bn(0) // TODO
  const runeInboundFee = bn(0) // TODO
  const totalFees = assetInboundFee.plus(runeInboundFee)

  return {
    assetPool: pool.asset,
    slipPercent: slip.times(100).toFixed(),
    poolShareAssetCryptoThorPrecision: poolShare.assetShare.toFixed(),
    poolShareRuneCryptoThorPrecision: poolShare.runeShare.toFixed(),
    poolShareDecimalPercent: poolShare.poolShareDecimalPercent,
    liquidityUnitsCryptoThorPrecision,
    assetAmountCryptoThorPrecision: poolShare.assetShare.toFixed(),
    runeAmountCryptoThorPrecision: poolShare.runeShare.toFixed(),
    inbound: {
      fees: {
        asset: assetInboundFee.toFixed(),
        rune: runeInboundFee.toFixed(),
        total: totalFees.toFixed(),
      },
    },
  }
}

// Calculates all-time volume from the stats endpoint
export const calculateTotalVolumeFiatUserCurrency = (
  toAssetVolume: string,
  toRuneVolume: string,
  btcPrice: number,
  runePrice: number,
): string => {
  const toAssetVolumeCryptoPrecision = fromThorBaseUnit(toAssetVolume)
  const toRuneVolumeCryptoPrecision = fromThorBaseUnit(toRuneVolume)

  const toAassetTotalVolumeFiatUserCurrency = toAssetVolumeCryptoPrecision.times(btcPrice)
  const toRuneTotalVolumeRuneFiatUserCurrency = toRuneVolumeCryptoPrecision.times(runePrice)

  const totalVolumeFiatUserCurrency = toAassetTotalVolumeFiatUserCurrency.plus(
    toRuneTotalVolumeRuneFiatUserCurrency,
  )

  return totalVolumeFiatUserCurrency.toFixed()
}

export const getEarnings = async ({ from }: { from: string }) => {
  const { data } = await axios.get<ThorchainEarningsHistoryResponse>(
    `${getConfig().REACT_APP_MIDGARD_URL}/history/earnings?from=${from}`,
  )

  return data
}

export const calculateEarnings = (
  _assetLiquidityFees: string,
  _runeLiquidityFees: string,
  userPoolShare: string,
  runePrice: string,
  assetPrice: string,
) => {
  const assetLiquidityFees = fromThorBaseUnit(_assetLiquidityFees)
  const runeLiquidityFees = fromThorBaseUnit(_runeLiquidityFees)

  const userShare = bn(userPoolShare)
  const assetEarnings = userShare.times(assetLiquidityFees).times(2).toFixed()
  const runeEarnings = userShare.times(runeLiquidityFees).times(2).toFixed()

  const totalEarningsFiatUserCurrency = bn(assetEarnings)
    .times(assetPrice)
    .plus(bn(runeEarnings).times(runePrice))
    .toFixed()

  return { totalEarningsFiatUserCurrency, assetEarnings, runeEarnings }
}

export const calculatePoolOwnershipPercentage = ({
  userLiquidityUnits,
  totalPoolUnits,
}: {
  userLiquidityUnits: string
  totalPoolUnits: string
}): string => bn(userLiquidityUnits).div(totalPoolUnits).times(100).toFixed()
