import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero, fromBaseUnit, toBaseUnit } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { ProtocolFee, SwapErrorRight, SwapperConfig } from '../../../types'
import { TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import type { PanoraSwapResponse } from '../types'
import { isSupportedChainId, PANORA_INTEGRATOR_FEE_ADDRESS } from '../utils/constants'
import { getTokenAddress } from '../utils/helpers'
import { getPanoraService } from '../utils/panoraService'

type PanoraTradeDataInput = {
  sellAsset: Asset
  buyAsset: Asset
  sellAmountIncludingProtocolFeesCryptoBaseUnit: string
  receiveAddress: string
  affiliateBps: string | undefined
  slippagePercentage: number
  config: SwapperConfig
}

type PanoraTradeData = {
  buyAmountAfterFeesCryptoBaseUnit: string
  rate: string
  protocolFees: Record<AssetId, ProtocolFee>
  txData: {
    function: string
    type_arguments: string[]
    arguments: string[]
  }
  feeTokenAmount: string
  priceImpact: number
}

export const getPanoraTradeData = async (
  input: PanoraTradeDataInput,
): Promise<Result<PanoraTradeData, SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    affiliateBps,
    slippagePercentage,
    config,
  } = input

  if (!isSupportedChainId(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: buyAsset.chainId },
      }),
    )
  }

  const fromTokenAddress = getTokenAddress(sellAsset)
  const toTokenAddress = getTokenAddress(buyAsset)

  // Convert affiliateBps (basis points) to integratorFeePercentage
  // e.g. 30 bps = 0.3%
  const integratorFeePercentage =
    affiliateBps !== undefined ? bnOrZero(affiliateBps).div(100).toNumber() : undefined

  const requestBody: Record<string, unknown> = {
    fromTokenAddress,
    toTokenAddress,
    // The Panora API deals in human-readable token amounts, not base units
    fromTokenAmount: fromBaseUnit(
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset.precision,
    ),
    toWalletAddress: receiveAddress,
    slippagePercentage,
  }

  // Panora deducts integratorFeePercentage from the user even without integratorFeeAddress,
  // but only routes it on-chain when the address is present. Never send the percentage alone.
  if (
    PANORA_INTEGRATOR_FEE_ADDRESS &&
    integratorFeePercentage !== undefined &&
    integratorFeePercentage > 0
  ) {
    requestBody.integratorFeePercentage = integratorFeePercentage
    requestBody.integratorFeeAddress = PANORA_INTEGRATOR_FEE_ADDRESS
  }

  try {
    const panoraService = getPanoraService(config.VITE_PANORA_API_KEY)
    const responseResult = await panoraService.post<PanoraSwapResponse>('/swap', requestBody)

    if (responseResult.isErr()) {
      return Err(responseResult.unwrapErr())
    }

    const { data } = responseResult.unwrap()

    if (!data?.quotes || data.quotes.length === 0) {
      return Err(
        makeSwapErrorRight({
          message: `No quotes returned from Panora for ${sellAsset.symbol}/${buyAsset.symbol}`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    // Take the best quote (first one)
    const bestQuote = data.quotes[0]

    const buyAmountAfterFeesCryptoBaseUnit = toBaseUnit(bestQuote.toTokenAmount, buyAsset.precision)

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    const protocolFees: Record<AssetId, ProtocolFee> = {}

    return Ok({
      buyAmountAfterFeesCryptoBaseUnit,
      rate,
      protocolFees,
      txData: bestQuote.txData,
      feeTokenAmount: bestQuote.feeTokenAmount,
      priceImpact: bestQuote.priceImpact,
    })
  } catch (error) {
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting Panora data',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}
