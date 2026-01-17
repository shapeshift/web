import { Asset as DedustAsset, PoolType, ReadinessStatus } from '@dedust/sdk'
import { Err, Ok } from '@sniptt/monads'
import type { Address } from '@ton/core'

import type { CommonTradeQuoteInput, TradeQuote, TradeQuoteResult } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import type { DedustAssetAddress, DedustTradeSpecific } from '../types'
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
  return DedustAsset.jetton(dedustAddress.address as unknown as Address)
}

const buildDedustSpecific = (
  poolAddress: string,
  sellAssetAddress: DedustAssetAddress,
  buyAssetAddress: DedustAssetAddress,
  sellAmount: string,
  minBuyAmount: string,
  gasBudget: string,
): DedustTradeSpecific => ({
  poolAddress,
  sellAssetAddress: sellAssetAddress.address,
  buyAssetAddress: buyAssetAddress.address,
  sellAmount,
  minBuyAmount,
  gasBudget,
  quoteTimestamp: Date.now(),
})

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

    const poolContract = await factory.getPool(PoolType.VOLATILE, [sellDedustAsset, buyDedustAsset])

    if (!poolContract) {
      return Err(
        makeSwapErrorRight({
          message: `[DeDust] No pool found for this pair`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const pool = client.open(poolContract)
    const poolAddress = pool.address.toString()

    const readinessStatus = await pool.getReadinessStatus()
    if (readinessStatus !== ReadinessStatus.READY) {
      return Err(
        makeSwapErrorRight({
          message: `[DeDust] Pool is not ready for swaps (status: ${readinessStatus})`,
          code: TradeQuoteError.UnsupportedTradePair,
        }),
      )
    }

    const { amountOut } = await pool.getEstimatedSwapOut({
      assetIn: sellDedustAsset,
      amountIn: BigInt(sellAmountIncludingProtocolFeesCryptoBaseUnit),
    })

    if (amountOut <= 0n) {
      return Err(
        makeSwapErrorRight({
          message: `[DeDust] Pool returned zero output amount`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

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
