import { type AccountId, type AssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import type { AxiosError } from 'axios'
import axios from 'axios'
import { getConfig } from 'config'
import { getAddress, isAddress } from 'viem'
import { type BN, bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { MidgardPoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import type { AsymSide } from 'pages/ThorChainLP/hooks/useUserLpData'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'

import { fromThorBaseUnit, getAccountAddresses } from '.'
import type {
  MidgardLiquidityProvider,
  MidgardLiquidityProvidersList,
  MidgardPool,
  MidgardPoolStats,
  MidgardSwapHistoryResponse,
  PoolShareDetail,
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

export const getAllThorchainLiquidityMembers = async (): Promise<MidgardLiquidityProvidersList> => {
  const { data } = await axios.get<MidgardLiquidityProvidersList>(
    `${getConfig().REACT_APP_MIDGARD_URL}/members`,
  )

  if (!data?.length || 'error' in data) return []

  return data
}

export const getThorchainLiquidityMember = async (
  _address: string,
): Promise<MidgardLiquidityProvider | null> => {
  // Ensure Ethereum addresses are checksummed
  const address = isAddress(_address) ? getAddress(_address) : _address
  try {
    const { data } = await axios.get<MidgardLiquidityProvider>(
      `${getConfig().REACT_APP_MIDGARD_URL}/member/${address}`,
    )

    return data
  } catch (e) {
    // THORCHain returns a 404 which is perfectly valid, but axios catches as an error
    // We only want to log errors to the console if they're actual errors, not 404s
    if ((e as AxiosError).isAxiosError && (e as AxiosError).response?.status !== 404)
      console.error(e)

    return null
  }
}

export const getThorchainLiquidityProviderPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId
  assetId: AssetId
}): Promise<(MidgardPool & { accountId: AccountId })[] | null> => {
  const accountPosition = await (async () => {
    if (!isUtxoChainId(fromAssetId(assetId).chainId)) {
      const address = fromAccountId(accountId).account
      return getThorchainLiquidityMember(address)
    }

    const allMembers = await getAllThorchainLiquidityMembers()

    if (!allMembers.length) {
      throw new Error(`No THORChain members found`)
    }

    const accountAddresses = await getAccountAddresses(accountId)

    const foundMember = allMembers.find(member => accountAddresses.includes(member))
    if (!foundMember) return null

    return getThorchainLiquidityMember(foundMember)
  })()
  if (!accountPosition) return null

  // An address may be shared across multiple pools for EVM chains, which could produce wrong results
  const positions = accountPosition.pools
    .filter(pool => pool.pool === assetIdToPoolAssetId({ assetId }))
    .map(position => ({ ...position, accountId }))

  return positions
}

export const calculateTVL = (
  assetDepthCryptoBaseUnit: string,
  runeDepthCryptoBaseUnit: string,
  runePrice: string,
): string => {
  const assetDepthCryptoPrecision = fromThorBaseUnit(assetDepthCryptoBaseUnit)
  const runeDepthCryptoPrecision = fromThorBaseUnit(runeDepthCryptoBaseUnit)

  const assetValueFiatUserCurrency = assetDepthCryptoPrecision.times(runePrice)
  const runeValueFiatUserCurrency = runeDepthCryptoPrecision.times(runePrice)

  const tvl = assetValueFiatUserCurrency.plus(runeValueFiatUserCurrency).times(2)

  return tvl.toFixed()
}

export const getVolume = async (
  timeframe: '24h' | '7d',
  assetId: AssetId,
  runePrice: string,
): Promise<string> => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })
  const days = timeframe === '24h' ? '1' : '7'

  const { data } = await axios.get<MidgardSwapHistoryResponse>(
    `${
      getConfig().REACT_APP_MIDGARD_URL
    }/history/swaps?interval=day&count=${days}&pool=${poolAssetId}`,
  )

  const volume = (data?.intervals ?? []).reduce(
    (acc, { totalVolume }) => acc.plus(totalVolume),
    bn(0),
  )

  return fromThorBaseUnit(volume).times(runePrice).toFixed()
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

// Does pretty much what it says on the box. Uses the user and pool data to calculate the user's *current* value in both ROON and asset
export const getCurrentValue = (
  liquidityUnits: string,
  poolUnits: string,
  assetDepth: string,
  runeDepth: string,
): { rune: string; asset: string } => {
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
  }
}

// https://dev.thorchain.org/thorchain-dev/interface-guide/math#lp-units-add
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
export const estimateRemoveThorchainLiquidityPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId
  assetId: AssetId
  assetAmountCryptoThorPrecision: string
  asymSide: AsymSide | null
}) => {
  const lpPositions = await getThorchainLiquidityProviderPosition({ accountId, assetId })
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
