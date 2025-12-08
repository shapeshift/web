import type { CetusClmmSDK, Pool } from '@cetusprotocol/cetus-sui-clmm-sdk'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bn, bnOrZero } from '@shapeshiftoss/utils'

let sdkInstance: CetusClmmSDK | undefined

export const getCetusSDK = async (): Promise<CetusClmmSDK> => {
  if (!sdkInstance) {
    const { initMainnetSDK } = await import('@cetusprotocol/cetus-sui-clmm-sdk')
    sdkInstance = initMainnetSDK()
  }
  return sdkInstance
}

export const getCoinType = (asset: Asset): string => {
  const { assetReference, assetNamespace } = fromAssetId(asset.assetId)

  // For native SUI token, the assetReference is 'slip44:784' but Cetus expects '0x2::sui::SUI'
  if (assetNamespace === 'slip44') {
    return '0x2::sui::SUI'
  }

  // For other tokens, the assetReference should be the full coin type
  return assetReference
}

export const determineSwapDirection = (
  pool: Pool,
  sellCoinType: string,
  buyCoinType: string,
): boolean => {
  if (pool.coinTypeA === sellCoinType && pool.coinTypeB === buyCoinType) {
    return true
  }
  if (pool.coinTypeA === buyCoinType && pool.coinTypeB === sellCoinType) {
    return false
  }
  throw new Error('Pool does not match the swap pair')
}

export const calculateAmountLimit = (
  estimatedAmount: string,
  slippageTolerancePercentageDecimal: string | undefined,
  isBuyAmount: boolean,
): string => {
  if (!slippageTolerancePercentageDecimal) {
    return estimatedAmount
  }

  const slippageFactor = bn(1).minus(slippageTolerancePercentageDecimal)

  if (isBuyAmount) {
    return bnOrZero(estimatedAmount).times(slippageFactor).toFixed(0)
  }

  const maxSlippageFactor = bn(1).plus(slippageTolerancePercentageDecimal)
  return bnOrZero(estimatedAmount).times(maxSlippageFactor).toFixed(0)
}

export const findBestPool = async (
  sdk: CetusClmmSDK,
  sellCoinType: string,
  buyCoinType: string,
): Promise<Pool | undefined> => {
  const pools = await sdk.Pool.getPoolByCoins([sellCoinType, buyCoinType])

  if (!pools || pools.length === 0) {
    return undefined
  }

  // Filter pools with liquidity and sort by liquidity (highest first)
  const poolsWithLiquidity = pools
    .filter(pool => pool.liquidity && bnOrZero(pool.liquidity).gt(0))
    .sort((a, b) => {
      const liquidityA = bnOrZero(a.liquidity)
      const liquidityB = bnOrZero(b.liquidity)
      // Sort descending (b - a)
      return liquidityB.minus(liquidityA).toNumber()
    })

  if (poolsWithLiquidity.length === 0) {
    console.warn('[Cetus] No pools with liquidity found for', sellCoinType, buyCoinType, {
      totalPools: pools.length,
      pools: pools.map(p => ({ id: p.poolAddress, liquidity: p.liquidity })),
    })
    return undefined
  }

  // Return the pool with highest liquidity
  return poolsWithLiquidity[0]
}

export type CalculateSwapResult = {
  estimatedAmountOut: string
  estimatedAmountIn: string
  estimatedFeeAmount: string
}

export const calculateSwapAmounts = async (
  sdk: CetusClmmSDK,
  pool: Pool,
  sellAsset: Asset,
  buyAsset: Asset,
  sellAmount: string,
): Promise<CalculateSwapResult | undefined> => {
  const sellCoinType = getCoinType(sellAsset)
  const buyCoinType = getCoinType(buyAsset)

  const a2b = determineSwapDirection(pool, sellCoinType, buyCoinType)

  const decimalsA = pool.coinTypeA === sellCoinType ? sellAsset.precision : buyAsset.precision
  const decimalsB = pool.coinTypeA === sellCoinType ? buyAsset.precision : sellAsset.precision

  const preSwapParams = {
    pool,
    currentSqrtPrice: pool.current_sqrt_price,
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB,
    decimalsA,
    decimalsB,
    a2b,
    byAmountIn: true,
    amount: sellAmount,
  }

  const preSwapResult = await sdk.Swap.preswap(preSwapParams)

  if (!preSwapResult) {
    return undefined
  }

  if (preSwapResult.estimatedAmountOut === '0' || preSwapResult.estimatedAmountOut === '') {
    return undefined
  }

  return {
    estimatedAmountOut: preSwapResult.estimatedAmountOut,
    estimatedAmountIn: preSwapResult.estimatedAmountIn,
    estimatedFeeAmount: preSwapResult.estimatedFeeAmount,
  }
}
