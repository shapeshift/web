import type { ChainId } from '@shapeshiftoss/caip'
import { type AssetId, cosmosChainId, thorchainChainId } from '@shapeshiftoss/caip'
import type { KnownChainIds } from '@shapeshiftoss/types'
import axios from 'axios'
import { getConfig } from 'config'
import type { BN } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ThornodePoolResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { assetIdToPoolAssetId } from 'lib/swapper/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import { thorService } from 'lib/swapper/swappers/ThorchainSwapper/utils/thorService'
import { isUtxoChainId } from 'state/slices/portfolioSlice/utils'

import { getSupportedEvmChainIds } from '../evm'
import { fromThorBaseUnit } from '.'
import { THOR_PRECISION } from './constants'
import type {
  MidgardEarningsHistoryPoolItem,
  PoolShareDetail,
  SlippageDetails,
  ThorchainLiquidityProvidersResponseSuccess,
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

// formula: P(Ra + rA) / 2RA
// https://dev.thorchain.org/concepts/math.html#lp-units-add
export const getLiquidityUnits = ({
  pool,
  assetAmountThorBaseUnit,
  runeAmountThorBaseUnit,
}: {
  pool: ThornodePoolResponse
  assetAmountThorBaseUnit: string
  runeAmountThorBaseUnit: string
}): BN => {
  const P = pool.pool_units
  const a = assetAmountThorBaseUnit
  const r = runeAmountThorBaseUnit
  const R = pool.balance_rune
  const A = pool.balance_asset
  const part1 = bnOrZero(R).times(a)
  const part2 = bnOrZero(r).times(A)
  const numerator = bnOrZero(P).times(part1.plus(part2))
  const denominator = bnOrZero(R).times(A).times(2)
  return numerator.div(denominator)
}

// pool share formula: L/P = S
// asset share formula: A*S
// rune share formula: R*S
export const getPoolShare = (pool: ThornodePoolResponse, liquidityUnits: BN): PoolShareDetail => {
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

// formula: inputAmount / (inputAmount + inputBalance)
// https://dev.thorchain.org/concepts/math.html#slippage
export const getSlippage = ({
  pool,
  assetAmountThorBaseUnit,
  runeAmountThorBaseUnit,
}: {
  pool: ThornodePoolResponse
  assetAmountThorBaseUnit: string
  runeAmountThorBaseUnit: string
}): SlippageDetails => {
  // slippage is calculated on inputAmount divided by 2 to represent the 50:50 rebalance of the input amount
  const a = bnOrZero(assetAmountThorBaseUnit).div(2)
  const r = bnOrZero(runeAmountThorBaseUnit).div(2)

  const A = pool.balance_asset
  const R = pool.balance_rune

  if (a.gt(0) && r.eq(0)) {
    const assetPriceInRune = bnOrZero(pool.balance_rune).div(pool.balance_asset)
    const slippageBps = a.div(a.plus(A))
    const aInRune = a.times(assetPriceInRune)

    return {
      decimalPercent: slippageBps.times(100).toFixed(),
      runeAmountCryptoPrecision: fromThorBaseUnit(aInRune.times(slippageBps)).toFixed(
        THOR_PRECISION,
      ),
    }
  }
  if (r.gt(0) && a.eq(0)) {
    const slippageBps = r.div(r.plus(R))

    return {
      decimalPercent: slippageBps.times(100).toFixed(),
      runeAmountCryptoPrecision: fromThorBaseUnit(r.times(slippageBps)).toFixed(THOR_PRECISION),
    }
  }

  // symmetrical lp positions incur no slippage as there is no rebalancing swap occuring
  return {
    decimalPercent: '0',
    runeAmountCryptoPrecision: '0',
  }
}

export const estimateAddThorchainLiquidityPosition = async ({
  assetId,
  assetAmountThorBaseUnit,
  runeAmountThorBaseUnit,
}: {
  assetId: AssetId
  assetAmountThorBaseUnit: string
  runeAmountThorBaseUnit: string
}) => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })

  const poolResult = await thorService.get<ThornodePoolResponse>(
    `${thornodeUrl}/lcd/thorchain/pool/${poolAssetId}`,
  )

  if (poolResult.isErr()) throw poolResult.unwrapErr()
  const pool = poolResult.unwrap().data

  const liquidityUnits = getLiquidityUnits({
    pool,
    assetAmountThorBaseUnit,
    runeAmountThorBaseUnit,
  })

  const poolShare = getPoolShare(pool, liquidityUnits)

  const slippage = getSlippage({
    runeAmountThorBaseUnit,
    assetAmountThorBaseUnit,
    pool,
  })

  return {
    slippageDecimalPercent: slippage.decimalPercent,
    slippageRuneCryptoPrecision: slippage.runeAmountCryptoPrecision,
    poolShareDecimalPercent: poolShare.poolShareDecimalPercent,
  }
}

export const estimateRemoveThorchainLiquidityPosition = async ({
  bps,
  assetId,
  liquidityUnits,
  runeAmountThorBaseUnit,
  assetAmountThorBaseUnit,
}: {
  bps: string
  assetId: AssetId
  liquidityUnits: string
  runeAmountThorBaseUnit: string
  assetAmountThorBaseUnit: string
}) => {
  const poolAssetId = assetIdToPoolAssetId({ assetId })

  const poolResult = await thorService.get<ThornodePoolResponse>(
    `${thornodeUrl}/lcd/thorchain/pool/${poolAssetId}`,
  )

  if (poolResult.isErr()) throw poolResult.unwrapErr()
  const pool = poolResult.unwrap().data

  const poolShare = getPoolShare(pool, bnOrZero(liquidityUnits).times(bps).div(10000))

  const slippage = getSlippage({
    runeAmountThorBaseUnit,
    assetAmountThorBaseUnit,
    pool,
  })

  return {
    slippageDecimalPercent: slippage.decimalPercent,
    slippageRuneCryptoPrecision: slippage.runeAmountCryptoPrecision,
    poolShareDecimalPercent: poolShare.poolShareDecimalPercent,
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
