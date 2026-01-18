import { Asset as DedustAsset, PoolType, ReadinessStatus } from '@dedust/sdk'
import { Err, Ok } from '@sniptt/monads'
import { address as tonAddress } from '@ton/core'

import type { CommonTradeQuoteInput, TradeQuote, TradeQuoteResult } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { DedustAssetAddress, DedustPoolType, DedustTradeSpecific } from '../types'
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
): DedustTradeSpecific => ({
  poolAddress,
  poolType,
  sellAssetAddress: sellAssetAddress.address,
  buyAssetAddress: buyAssetAddress.address,
  sellAmount,
  minBuyAmount,
  gasBudget,
  quoteTimestamp: Date.now(),
})

type PoolQuoteResult = {
  amountOut: bigint
  poolAddress: string
  poolType: DedustPoolType
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

export const getTradeQuote = async (input: CommonTradeQuoteInput): Promise<TradeQuoteResult> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    accountNumber,
    slippageTolerancePercentageDecimal,
  } = input

  const validation = validateTonAssets(sellAsset, buyAsset)
  if (!validation.isValid) {
    return validation.error as TradeQuoteResult
  }

  const { sellAssetAddress, buyAssetAddress } = validation
  const client = dedustClientManager.getClient()
  const factory = dedustClientManager.getFactory()

  try {
    const sellDedustAsset = dedustAddressToAsset(sellAssetAddress)
    const buyDedustAsset = dedustAddressToAsset(buyAssetAddress)
    const amountIn = BigInt(sellAmountIncludingProtocolFeesCryptoBaseUnit)

    // Try both STABLE and VOLATILE pools to find the best rate
    // STABLE pools use StableSwap curves optimized for stablecoin pairs
    // VOLATILE pools use standard constant product (x*y=k) formula
    const [stableQuote, volatileQuote] = await Promise.all([
      tryGetPoolQuote(factory, client, PoolType.STABLE, sellDedustAsset, buyDedustAsset, amountIn),
      tryGetPoolQuote(
        factory,
        client,
        PoolType.VOLATILE,
        sellDedustAsset,
        buyDedustAsset,
        amountIn,
      ),
    ])

    // Select the pool with the best output amount
    let bestQuote: PoolQuoteResult | null = null

    if (stableQuote && volatileQuote) {
      // Both pools exist - use the one with better rate
      bestQuote = stableQuote.amountOut >= volatileQuote.amountOut ? stableQuote : volatileQuote
    } else if (stableQuote) {
      bestQuote = stableQuote
    } else if (volatileQuote) {
      bestQuote = volatileQuote
    }

    if (!bestQuote) {
      return Err(
        makeSwapErrorRight({
          message: `[DeDust] No pool found for this pair`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const { amountOut, poolAddress, poolType } = bestQuote
    const buyAmountCryptoBaseUnit = amountOut.toString()
    const slippageBps = slippageDecimalToBps(
      slippageTolerancePercentageDecimal,
      DEDUST_DEFAULT_SLIPPAGE_BPS,
    )
    const minBuyAmount = calculateMinBuyAmount(buyAmountCryptoBaseUnit, slippageBps)

    const gasBudget =
      sellAssetAddress.type === 'native' ? DEDUST_GAS_BUDGET_TON : DEDUST_GAS_BUDGET_JETTON

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
    )

    const tradeQuote: TradeQuote = {
      id: `dedust-${poolAddress}-${Date.now()}`,
      rate,
      receiveAddress,
      affiliateBps: '0',
      slippageTolerancePercentageDecimal:
        slippageTolerancePercentageDecimal ?? String(DEDUST_DEFAULT_SLIPPAGE_BPS / 10000),
      quoteOrRate: 'quote',
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
          accountNumber,
          allowanceContract: '0x0',
          estimatedExecutionTimeMs: 30000,
          dedustSpecific,
        },
      ],
    }

    return Ok([tradeQuote])
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: `[DeDust] Error getting quote: ${err}`,
        code: TradeQuoteError.QueryFailed,
        cause: err,
      }),
    )
  }
}
