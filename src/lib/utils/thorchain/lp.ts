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
  MidgardPool,
  PoolShareDetail,
  ThorchainLiquidityProvidersResponseSuccess,
  ThorNodeLiquidityProvider,
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

export const getThorchainLiquidityProviderPosition = async ({
  accountId,
  assetId,
}: {
  accountId: AccountId
  assetId: AssetId
}): Promise<(ThorNodeLiquidityProvider & MidgardPool) | null> => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })

  const accountPosition = await (async () => {
    const address = fromAccountId(accountId).account
    if (!isUtxoChainId(fromAssetId(assetId).chainId))
      return (
        await axios.get<ThorNodeLiquidityProvider>(
          `${
            getConfig().REACT_APP_THORCHAIN_NODE_URL
          }/lcd/thorchain/pool/${poolAssetId}/liquidity_provider/${address}`,
        )
      ).data

    const liquidityProviderPositionsResponse =
      await getAllThorchainLiquidityProviderPositions(assetId)

    const allPositions = liquidityProviderPositionsResponse
    if (!allPositions.length) {
      throw new Error(`No LP positions found for asset ID: ${assetId}`)
    }

    const accountAddresses = await getAccountAddresses(accountId)

    return allPositions.find(position => accountAddresses.includes(position?.asset_address ?? ''))
  })()
  if (!accountPosition) return null

  // TODO(gomes): asset_address *or* rune_address when implementing sim. pools
  const { data: midgardLiquidityProvider } = await axios.get<MidgardLiquidityProvider>(
    `${getConfig().REACT_APP_MIDGARD_URL}/member/${accountPosition.asset_address}`,
  )

  // If we do have a THORNode /liquidity_provider/<address> response, we should assume that we're going to have a Midgard response with the matchint position
  // But in case we don't, let's not rug the whole position, and make the MidgardPool fields optional instead
  const maybeMidgardMember = midgardLiquidityProvider.pools.find(pool => pool.pool === poolAssetId)

  if (!maybeMidgardMember)
    throw new Error(`No Midgard position found for address: ${accountPosition.asset_address}`)

  return {
    ...accountPosition,
    ...maybeMidgardMember,
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
}): Promise<{}> => {
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
