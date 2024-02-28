import type { ChainId } from '@shapeshiftoss/caip'
import { type AssetId, cosmosChainId, thorchainChainId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import axios from 'axios'
import { getConfig } from 'config'
import { type BN, bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'

import { getSupportedEvmChainIds } from '../evm'
import { fromThorBaseUnit } from '.'
import type {
  MidgardEarningsHistoryPoolItem,
  PoolShareDetail,
  ThorchainLiquidityProvidersResponseSuccess,
  UserLpDataPosition,
} from './lp/types'

const thornodeUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL

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

// https://dev.thorchain.org/concepts/math.html#lp-units-add
export const getLiquidityUnits = ({
  pool,
  assetAmountCryptoThorPrecision,
  runeAmountCryptoThorPrecision,
}: {
  pool: ThornodePoolResponse
  assetAmountCryptoThorPrecision: string
  runeAmountCryptoThorPrecision: string
}): BN => {
  const P = pool.LP_units
  const a = assetAmountCryptoThorPrecision
  const r = runeAmountCryptoThorPrecision
  const R = pool.balance_rune
  const A = pool.balance_asset
  const part1 = bnOrZero(R).times(a)
  const part2 = bnOrZero(r).times(A)

  const numerator = bnOrZero(P).times(part1.plus(part2))
  const denominator = bnOrZero(R).times(A).times(2)
  const result = numerator.div(denominator)
  return result
}

export const getPoolShare = (pool: ThornodePoolResponse, liquidityUnits: BN): PoolShareDetail => {
  // pool share: L/P = S
  // asset share: A*S
  // rune share: R*S
  const L = liquidityUnits
  const P = pool.pool_units
  const R = pool.balance_rune
  const A = pool.balance_asset
  const S = L.div(P)

  return {
    runeShareThorBaseUnit: S.times(R),
    assetShareThorBaseUnit: S.times(A),
    poolShareDecimalPercent: S.toFixed(),
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
  pool: ThornodePoolResponse
}): BN => {
  // formula: (t * R - T * r)/ (T*r + R*T)
  const r = runeAmountCryptoThorPrecision
  const t = assetAmountCryptoThorPrecision
  const R = pool.balance_rune
  const T = pool.balance_asset
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

  const poolResult = await thorService.get<ThornodePoolResponse>(
    `${thornodeUrl}/lcd/thorchain/pool/${poolAssetId}`,
  )

  if (poolResult.isErr()) throw poolResult.unwrapErr()
  const pool = poolResult.unwrap().data

  const liquidityUnitsCryptoThorPrecision = getLiquidityUnits({
    pool,
    assetAmountCryptoThorPrecision,
    runeAmountCryptoThorPrecision,
  })
  const poolShare = getPoolShare(pool, liquidityUnitsCryptoThorPrecision)

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
    poolShareAsset: poolShare.assetShareThorBaseUnit.toFixed(),
    poolShareRune: poolShare.runeShareThorBaseUnit.toFixed(),
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

// https://dev.thorchain.org/concepts/math.html#lp-units-withdrawn
export const estimateRemoveThorchainLiquidityPosition = async ({
  assetId,
  userData,
  runeAmountCryptoThorPrecision,
  assetAmountCryptoThorPrecision,
}: {
  assetId: AssetId
  userData: UserLpDataPosition
  runeAmountCryptoThorPrecision: string
  assetAmountCryptoThorPrecision: string
}) => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })

  const poolResult = await thorService.get<ThornodePoolResponse>(
    `${thornodeUrl}/lcd/thorchain/pool/${poolAssetId}`,
  )

  if (poolResult.isErr()) throw poolResult.unwrapErr()
  const pool = poolResult.unwrap().data

  const liquidityUnitsCryptoThorPrecision = getLiquidityUnits({
    pool,
    assetAmountCryptoThorPrecision,
    runeAmountCryptoThorPrecision,
  })

  const poolShare = getPoolShare(pool, liquidityUnitsCryptoThorPrecision)

  const slip = getSlipOnLiquidity({
    runeAmountCryptoThorPrecision,
    assetAmountCryptoThorPrecision,
    pool,
  })

  const assetInboundFee = bn(0) // TODO
  const runeInboundFee = bn(0) // TODO
  const totalFees = assetInboundFee.plus(runeInboundFee)

  return {
    assetPool: pool.asset,
    slipPercent: slip.times(100).toFixed(),
    poolShareAssetCryptoThorPrecision: poolShare.assetShareThorBaseUnit.toFixed(),
    poolShareRuneCryptoThorPrecision: poolShare.runeShareThorBaseUnit.toFixed(),
    poolShareDecimalPercent: poolShare.poolShareDecimalPercent,
    liquidityUnitsCryptoThorPrecision: userData.liquidityUnits,
    assetAmountCryptoThorPrecision: poolShare.assetShareThorBaseUnit.toFixed(),
    runeAmountCryptoThorPrecision: poolShare.runeShareThorBaseUnit.toFixed(),
    inbound: {
      fees: {
        asset: assetInboundFee.toFixed(),
        rune: runeInboundFee.toFixed(),
        total: totalFees.toFixed(),
      },
    },
  }
}

export const calculateEarnings = (
  pool: MidgardEarningsHistoryPoolItem,
  userPoolShare: string,
  runePrice: string,
) => {
  const totalEarningsRune = fromThorBaseUnit(pool.earnings).times(userPoolShare)
  const totalEarningsFiat = totalEarningsRune.times(runePrice).toFixed()

  const assetEarningsCryptoPrecision = fromThorBaseUnit(pool.assetLiquidityFees)
    .times(userPoolShare)
    .toFixed()

  const runeBlockRewards = fromThorBaseUnit(pool.rewards).times(userPoolShare)
  const runeFees = fromThorBaseUnit(pool.runeLiquidityFees).times(userPoolShare)
  const runeEarningsCryptoPrecision = runeFees.plus(runeBlockRewards).toFixed()

  return { totalEarningsFiat, assetEarningsCryptoPrecision, runeEarningsCryptoPrecision }
}

// A THOR LP deposit can either be:
// - a RUNE MsgDeposit message type
// - an EVM custom Tx, i.e., a Tx with calldata
// - a regular send with a memo (for ATOM and UTXOs)
export const getThorchainLpTransactionType = (chainId: ChainId) => {
  const isRuneTx = chainId === thorchainChainId
  if (isRuneTx) return 'MsgDeposit'

  const supportedEvmChainIds = getSupportedEvmChainIds()
  if (supportedEvmChainIds.includes(chainId as KnownChainIds)) {
    return 'EvmCustomTx'
  }
  if (isUtxoChainId(chainId) || chainId === cosmosChainId) {
    return 'Send'
  }

  throw new Error(`Unsupported ChainId ${chainId}`)
}
