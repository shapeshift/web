import { type AccountId, type AssetId, fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import { getConfig } from 'config'
import { type BN, bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { MidgardPoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'

import { getAccountAddresses } from '.'
import type {
  MidgardLiquidityProvider,
  MidgardLiquidityProvidersList,
  MidgardPool,
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
  address: string,
): Promise<MidgardLiquidityProvider | null> => {
  const { data } = await axios.get<MidgardLiquidityProvider>(
    `${getConfig().REACT_APP_MIDGARD_URL}/member/${address}`,
  )

  return data
}

export const getThorchainLiquidityProviderPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId
  assetId: AssetId
}): Promise<{
  positions: MidgardPool[]
  poolData: ThornodePoolResponse
} | null> => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })

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

  const positions = accountPosition.pools

  const { data: poolData } = await axios.get<ThornodePoolResponse>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/pool/${poolAssetId}`,
  )
  return {
    positions,
    poolData,
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
  const liquidityUnits = getLiquidityUnits({
    pool,
    assetAmountCryptoThorPrecision,
    runeAmountCryptoThorPrecision,
  })
  const poolShare = getPoolShare(liquidityUnits, pool)

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
    slipPercent: slip.times(100),
    poolShare,
    liquidityUnits,
    inbound: {
      fees: {
        asset: assetInboundFee,
        rune: runeInboundFee,
        total: totalFees,
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
}) => {
  const lpPosition = await getThorchainLiquidityProviderPosition({ accountId, assetId })
  const poolAssetId = assetIdToPoolAssetId({ assetId })
  const liquidityUnits = lpPosition?.liquidityUnits
  const poolResult = await thorService.get<MidgardPoolResponse>(`${midgardUrl}/pool/${poolAssetId}`)
  if (poolResult.isErr()) throw poolResult.unwrapErr()
  const pool = poolResult.unwrap().data
  const poolShare = getPoolShare(bnOrZero(liquidityUnits), pool)
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
    slipPercent: slip.times(100),
    poolShare,
    liquidityUnits,
    assetAmount: poolShare.assetShare,
    runeAmount: poolShare.runeShare,
    inbound: {
      fees: {
        asset: assetInboundFee,
        rune: runeInboundFee,
        total: totalFees,
      },
    },
  }
}
