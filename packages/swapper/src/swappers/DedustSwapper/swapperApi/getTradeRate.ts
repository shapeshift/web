import { Asset as DedustAsset, PoolType, ReadinessStatus } from '@dedust/sdk'
import { Err, Ok } from '@sniptt/monads'
import { address as tonAddress } from '@ton/core'

import type { GetTradeRateInput, TradeRate, TradeRateResult } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type {
  DedustAssetAddress,
  DedustPoolType,
  DedustSwapHop,
  DedustTradeSpecific,
} from '../types'
import {
  DEDUST_DEFAULT_SLIPPAGE_BPS,
  DEDUST_GAS_BUDGET_JETTON,
  DEDUST_GAS_BUDGET_TON,
} from '../utils/constants'
import { dedustClientManager } from '../utils/dedustClient'
import {
  calculateMinBuyAmount,
  calculateRate,
  slippageDecimalToBps,
  validateTonAssets,
} from '../utils/helpers'

const dedustAddressToAsset = (dedustAddress: DedustAssetAddress): DedustAsset => {
  if (dedustAddress.type === 'native') {
    return DedustAsset.native()
  }
  return DedustAsset.jetton(tonAddress(dedustAddress.address))
}

const buildDedustSpecific = (
  poolAddress: string,
  poolType: DedustPoolType,
  sellAssetAddress: DedustAssetAddress,
  buyAssetAddress: DedustAssetAddress,
  sellAmount: string,
  minBuyAmount: string,
  gasBudget: string,
  hops?: DedustSwapHop[],
): DedustTradeSpecific => ({
  poolAddress,
  poolType,
  sellAssetAddress: sellAssetAddress.address,
  buyAssetAddress: buyAssetAddress.address,
  sellAmount,
  minBuyAmount,
  gasBudget,
  quoteTimestamp: Date.now(),
  hops,
})

type PoolQuoteResult = {
  amountOut: bigint
  poolAddress: string
  poolType: DedustPoolType
}

/**
 * Multi-hop route result containing both hops
 */
type MultiHopRouteResult = {
  amountOut: bigint
  hop1: PoolQuoteResult
  hop2: PoolQuoteResult
  intermediateAmount: bigint
}

/**
 * Try to get a quote from a specific pool type.
 * Returns null if pool doesn't exist or isn't ready.
 */
const tryGetPoolQuote = async (
  factory: ReturnType<typeof dedustClientManager.getFactory>,
  client: ReturnType<typeof dedustClientManager.getClient>,
  poolType: PoolType,
  sellDedustAsset: DedustAsset,
  buyDedustAsset: DedustAsset,
  amountIn: bigint,
): Promise<PoolQuoteResult | null> => {
  try {
    const poolContract = await factory.getPool(poolType, [sellDedustAsset, buyDedustAsset])

    if (!poolContract) {
      return null
    }

    const pool = client.open(poolContract)
    const readinessStatus = await pool.getReadinessStatus()

    if (readinessStatus !== ReadinessStatus.READY) {
      return null
    }

    const { amountOut } = await pool.getEstimatedSwapOut({
      assetIn: sellDedustAsset,
      amountIn,
    })

    if (amountOut <= 0n) {
      return null
    }

    return {
      amountOut,
      poolAddress: pool.address.toString(),
      poolType: poolType === PoolType.STABLE ? 'STABLE' : 'VOLATILE',
    }
  } catch {
    return null
  }
}

/**
 * Try to find a multi-hop route through TON (native asset).
 * This helps find better rates for pairs that don't have direct pools with good liquidity.
 * Route: sellAsset -> TON -> buyAsset
 */
const tryGetMultiHopRoute = async (
  factory: ReturnType<typeof dedustClientManager.getFactory>,
  client: ReturnType<typeof dedustClientManager.getClient>,
  sellDedustAsset: DedustAsset,
  buyDedustAsset: DedustAsset,
  amountIn: bigint,
): Promise<MultiHopRouteResult | null> => {
  // Skip if either asset is already TON (no point in routing through same asset)
  const tonAsset = DedustAsset.native()

  try {
    // Try both STABLE and VOLATILE for first hop (sellAsset -> TON)
    const [hop1Stable, hop1Volatile] = await Promise.all([
      tryGetPoolQuote(factory, client, PoolType.STABLE, sellDedustAsset, tonAsset, amountIn),
      tryGetPoolQuote(factory, client, PoolType.VOLATILE, sellDedustAsset, tonAsset, amountIn),
    ])

    // Select best first hop
    let bestHop1: PoolQuoteResult | null = null
    if (hop1Stable && hop1Volatile) {
      bestHop1 = hop1Stable.amountOut >= hop1Volatile.amountOut ? hop1Stable : hop1Volatile
    } else {
      bestHop1 = hop1Stable || hop1Volatile
    }

    if (!bestHop1) {
      return null
    }

    const intermediateAmount = bestHop1.amountOut

    // Try both STABLE and VOLATILE for second hop (TON -> buyAsset)
    const [hop2Stable, hop2Volatile] = await Promise.all([
      tryGetPoolQuote(
        factory,
        client,
        PoolType.STABLE,
        tonAsset,
        buyDedustAsset,
        intermediateAmount,
      ),
      tryGetPoolQuote(
        factory,
        client,
        PoolType.VOLATILE,
        tonAsset,
        buyDedustAsset,
        intermediateAmount,
      ),
    ])

    // Select best second hop
    let bestHop2: PoolQuoteResult | null = null
    if (hop2Stable && hop2Volatile) {
      bestHop2 = hop2Stable.amountOut >= hop2Volatile.amountOut ? hop2Stable : hop2Volatile
    } else {
      bestHop2 = hop2Stable || hop2Volatile
    }

    if (!bestHop2) {
      return null
    }

    return {
      amountOut: bestHop2.amountOut,
      hop1: bestHop1,
      hop2: bestHop2,
      intermediateAmount,
    }
  } catch {
    return null
  }
}

export const getTradeRate = async (input: GetTradeRateInput): Promise<TradeRateResult> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    slippageTolerancePercentageDecimal,
  } = input

  const validation = validateTonAssets(sellAsset, buyAsset)
  if (!validation.isValid) {
    return validation.error as TradeRateResult
  }

  const { sellAssetAddress, buyAssetAddress } = validation
  const client = dedustClientManager.getClient()
  const factory = dedustClientManager.getFactory()

  try {
    const sellDedustAsset = dedustAddressToAsset(sellAssetAddress)
    const buyDedustAsset = dedustAddressToAsset(buyAssetAddress)
    const amountIn = BigInt(sellAmountIncludingProtocolFeesCryptoBaseUnit)

    // Check if either asset is TON (native) - skip multi-hop if so
    const sellIsTon = sellAssetAddress.type === 'native'
    const buyIsTon = buyAssetAddress.type === 'native'

    // Try direct pools (STABLE and VOLATILE) in parallel with multi-hop route
    // STABLE pools use StableSwap curves optimized for stablecoin pairs
    // VOLATILE pools use standard constant product (x*y=k) formula
    const [stableQuote, volatileQuote, multiHopRoute] = await Promise.all([
      tryGetPoolQuote(factory, client, PoolType.STABLE, sellDedustAsset, buyDedustAsset, amountIn),
      tryGetPoolQuote(
        factory,
        client,
        PoolType.VOLATILE,
        sellDedustAsset,
        buyDedustAsset,
        amountIn,
      ),
      // Only try multi-hop if neither asset is TON
      sellIsTon || buyIsTon
        ? Promise.resolve(null)
        : tryGetMultiHopRoute(factory, client, sellDedustAsset, buyDedustAsset, amountIn),
    ])

    // Select the best direct pool
    let bestDirectQuote: PoolQuoteResult | null = null
    if (stableQuote && volatileQuote) {
      bestDirectQuote =
        stableQuote.amountOut >= volatileQuote.amountOut ? stableQuote : volatileQuote
    } else {
      bestDirectQuote = stableQuote || volatileQuote
    }

    // Determine if multi-hop is better than direct
    const useMultiHop =
      multiHopRoute && (!bestDirectQuote || multiHopRoute.amountOut > bestDirectQuote.amountOut)

    if (!bestDirectQuote && !multiHopRoute) {
      return Err(
        makeSwapErrorRight({
          message: `[DeDust] No pool found for this pair`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    // Build the rate based on whether we're using multi-hop or direct
    let buyAmountCryptoBaseUnit: string
    let poolAddress: string
    let poolType: DedustPoolType
    let hops: DedustSwapHop[] | undefined
    // Multi-hop requires extra gas for two swaps
    let gasBudgetMultiplier = 1

    if (useMultiHop && multiHopRoute) {
      buyAmountCryptoBaseUnit = multiHopRoute.amountOut.toString()
      // Use the first hop's pool address as the primary (for identification)
      poolAddress = multiHopRoute.hop1.poolAddress
      poolType = multiHopRoute.hop1.poolType
      gasBudgetMultiplier = 2 // Two swaps

      // Build hop details for multi-hop execution
      hops = [
        {
          poolAddress: multiHopRoute.hop1.poolAddress,
          poolType: multiHopRoute.hop1.poolType,
          sellAssetAddress: sellAssetAddress.address,
          buyAssetAddress: 'native', // TON
          sellAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
          expectedBuyAmount: multiHopRoute.intermediateAmount.toString(),
        },
        {
          poolAddress: multiHopRoute.hop2.poolAddress,
          poolType: multiHopRoute.hop2.poolType,
          sellAssetAddress: 'native', // TON
          buyAssetAddress: buyAssetAddress.address,
          sellAmount: multiHopRoute.intermediateAmount.toString(),
          expectedBuyAmount: multiHopRoute.amountOut.toString(),
        },
      ]
    } else if (bestDirectQuote) {
      buyAmountCryptoBaseUnit = bestDirectQuote.amountOut.toString()
      poolAddress = bestDirectQuote.poolAddress
      poolType = bestDirectQuote.poolType
    } else {
      // This shouldn't happen given the check above, but TypeScript needs it
      return Err(
        makeSwapErrorRight({
          message: `[DeDust] No pool found for this pair`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const slippageBps = slippageDecimalToBps(
      slippageTolerancePercentageDecimal,
      DEDUST_DEFAULT_SLIPPAGE_BPS,
    )
    const minBuyAmount = calculateMinBuyAmount(buyAmountCryptoBaseUnit, slippageBps)

    const baseGasBudget =
      sellAssetAddress.type === 'native' ? DEDUST_GAS_BUDGET_TON : DEDUST_GAS_BUDGET_JETTON
    // Apply multiplier for multi-hop (need gas for both swaps)
    const gasBudget = (BigInt(baseGasBudget) * BigInt(gasBudgetMultiplier)).toString()

    const rate = calculateRate(
      buyAmountCryptoBaseUnit,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAsset.precision,
      sellAsset.precision,
    )

    const dedustSpecific = buildDedustSpecific(
      poolAddress,
      poolType,
      sellAssetAddress,
      buyAssetAddress,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      minBuyAmount,
      gasBudget,
      hops,
    )

    const tradeRate: TradeRate = {
      id: `dedust-${poolAddress}-${Date.now()}`,
      rate,
      receiveAddress,
      affiliateBps: '0',
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ?? String(DEDUST_DEFAULT_SLIPPAGE_BPS / 10000),
      quoteOrRate: 'rate',
      swapperName: SwapperName.DeDust,
      steps: [
        {
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit: buyAmountCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            networkFeeCryptoBaseUnit: gasBudget,
            protocolFees: undefined,
          },
          rate,
          source: SwapperName.DeDust,
          buyAsset,
          sellAsset,
          accountNumber: undefined,
          allowanceContract: '0x0',
          estimatedExecutionTimeMs: useMultiHop ? 60000 : 30000, // Multi-hop takes longer
          dedustSpecific,
        },
      ],
    }

    return Ok([tradeRate])
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: `[DeDust] Error getting rate: ${err}`,
        code: TradeQuoteError.QueryFailed,
        cause: err,
      }),
    )
  }
}
