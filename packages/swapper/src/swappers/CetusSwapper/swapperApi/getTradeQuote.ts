import type { AssetId } from '@shapeshiftoss/caip'
import { suiAssetId } from '@shapeshiftoss/caip'
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import type {
  CommonTradeQuoteInput,
  ProtocolFee,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { isSupportedChainId } from '../utils/constants'
import { calculateSwapAmounts, findBestPool, getCetusSDK, getCoinType } from '../utils/helpers'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    receiveAddress,
    accountNumber,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  } = input

  const { assetsById } = deps

  if (accountNumber === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `accountNumber is required`,
        code: TradeQuoteError.InternalError,
      }),
    )
  }

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

  const suiAsset = assetsById[suiAssetId]

  if (!suiAsset) {
    return Err(
      makeSwapErrorRight({
        message: `suiAsset is required`,
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  try {
    const sdk = await getCetusSDK()

    const sellCoinType = getCoinType(sellAsset)
    const buyCoinType = getCoinType(buyAsset)

    const pool = await findBestPool(sdk, sellCoinType, buyCoinType)

    if (!pool) {
      return Err(
        makeSwapErrorRight({
          message: `No liquidity pool found for ${sellAsset.symbol}/${buyAsset.symbol}`,
          code: TradeQuoteError.NoRouteFound,
        }),
      )
    }

    const swapResult = await calculateSwapAmounts(sdk, pool, sellAsset, buyAsset, sellAmount)

    if (!swapResult) {
      return Err(
        makeSwapErrorRight({
          message: `Failed to calculate swap for ${sellAsset.symbol}/${buyAsset.symbol}`,
          code: TradeQuoteError.QueryFailed,
        }),
      )
    }

    const buyAmountAfterFeesCryptoBaseUnit = swapResult.estimatedAmountOut

    const rate = getInputOutputRate({
      sellAmountCryptoBaseUnit: sellAmount,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    const adapter = deps.assertGetSuiChainAdapter(sellAsset.chainId)

    const dummyAddress = '0x0000000000000000000000000000000000000000000000000000000000000000'
    const addressForFeeEstimate = receiveAddress ?? dummyAddress

    const getFeeDataInput: GetFeeDataInput<KnownChainIds.SuiMainnet> = {
      to: addressForFeeEstimate,
      value: sellAmount,
      chainSpecific: {
        from: addressForFeeEstimate,
        tokenId: getCoinType(sellAsset),
      },
    }

    const feeData = await adapter.getFeeData(getFeeDataInput)

    const protocolFees: Record<AssetId, ProtocolFee> = {}

    const quotes: TradeQuote[] = []

    const tradeQuote: TradeQuote = {
      id: uuid(),
      quoteOrRate: 'quote',
      rate,
      affiliateBps,
      receiveAddress,
      slippageTolerancePercentageDecimal,
      swapperName: SwapperName.Cetus,
      steps: [
        {
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
          feeData: {
            protocolFees,
            networkFeeCryptoBaseUnit: feeData.fast.txFee,
            chainSpecific: {
              gasBudget: feeData.fast.chainSpecific.gasBudget,
              gasPrice: feeData.fast.chainSpecific.gasPrice,
            },
          },
          rate,
          source: SwapperName.Cetus,
          buyAsset,
          sellAsset,
          allowanceContract: '0x0',
          estimatedExecutionTimeMs: undefined,
        },
      ],
    }

    quotes.push(tradeQuote)

    return Ok(quotes)
  } catch (error) {
    console.error(error)
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting Cetus quote',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}
