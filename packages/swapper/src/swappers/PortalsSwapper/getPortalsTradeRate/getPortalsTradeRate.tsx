import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bn, bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import { zeroAddress } from 'viem'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../..'
import type {
  GetEvmTradeRateInput,
  SingleHopTradeRateSteps,
  SwapErrorRight,
  SwapperConfig,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getInputOutputRate, makeSwapErrorRight } from '../../../utils'
import { isNativeEvmAsset } from '../../utils/helpers/helpers'
import { chainIdToPortalsNetwork } from '../constants'
import { fetchPortalsTradeEstimate } from '../utils/fetchPortalsTradeOrder'
import { getPortalsRouterAddressByChainId, isSupportedChainId } from '../utils/helpers'

export async function getPortalsTradeRate(
  input: GetEvmTradeRateInput,
  _assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  swapperConfig: SwapperConfig,
): Promise<Result<TradeRate, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    affiliateBps,
    potentialAffiliateBps,
    chainId,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
  } = input

  const sellAssetChainId = sellAsset.chainId
  const buyAssetChainId = buyAsset.chainId

  if (!isSupportedChainId(sellAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAssetChainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (sellAssetChainId !== buyAssetChainId) {
    return Err(
      makeSwapErrorRight({
        message: `cross-chain not supported - both assets must be on chainId ${sellAsset.chainId}`,
        code: TradeQuoteError.CrossChainNotSupported,
        details: { buyAsset, sellAsset },
      }),
    )
  }

  try {
    if (!isSupportedChainId(chainId)) throw new Error(`Unsupported chainId ${sellAsset.chainId}`)

    const portalsNetwork = chainIdToPortalsNetwork[chainId as KnownChainIds]

    if (!portalsNetwork) {
      return Err(
        makeSwapErrorRight({
          message: `unsupported ChainId`,
          code: TradeQuoteError.UnsupportedChain,
          details: { chainId: input.chainId },
        }),
      )
    }

    const sellAssetAddress = isNativeEvmAsset(sellAsset.assetId)
      ? zeroAddress
      : fromAssetId(sellAsset.assetId).assetReference
    const buyAssetAddress = isNativeEvmAsset(buyAsset.assetId)
      ? zeroAddress
      : fromAssetId(buyAsset.assetId).assetReference

    const inputToken = `${portalsNetwork}:${sellAssetAddress}`
    const outputToken = `${portalsNetwork}:${buyAssetAddress}`

    const userSlippageTolerancePercentageDecimalOrDefault = input.slippageTolerancePercentageDecimal
      ? Number(input.slippageTolerancePercentageDecimal)
      : undefined // Use auto slippage if no user preference is provided

    const quoteEstimateResponse = await fetchPortalsTradeEstimate({
      inputToken,
      outputToken,
      inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      slippageTolerancePercentage: userSlippageTolerancePercentageDecimalOrDefault
        ? userSlippageTolerancePercentageDecimalOrDefault * 100
        : bnOrZero(getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Portals))
            .times(100)
            .toNumber(),
      swapperConfig,
    })
    // Use the quote estimate endpoint to get a quote without a wallet

    const inputOutputRate = getInputOutputRate({
      sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit: quoteEstimateResponse?.context.outputAmount,
      sellAsset,
      buyAsset,
    })

    const allowanceContract = getPortalsRouterAddressByChainId(chainId)

    const slippageTolerancePercentageDecimal = quoteEstimateResponse.context
      .slippageTolerancePercentage
      ? bn(quoteEstimateResponse.context.slippageTolerancePercentage).div(100).toString()
      : undefined

    const buyAmountBeforeSlippageCryptoBaseUnit = bnOrZero(quoteEstimateResponse.minOutputAmount)
      .div(bn(1).minus(slippageTolerancePercentageDecimal ?? 0))
      .toFixed(0)

    const tradeRate = {
      id: uuid(),
      accountNumber,
      receiveAddress: undefined,
      affiliateBps,
      potentialAffiliateBps,
      rate: inputOutputRate,
      slippageTolerancePercentageDecimal,
      steps: [
        {
          estimatedExecutionTimeMs: undefined, // Portals doesn't provide this info
          allowanceContract,
          accountNumber,
          rate: inputOutputRate,
          buyAsset,
          sellAsset,
          // Before slippage on the right vs. before fees on the left is not a mistake.
          // Portals will yield different `outputAmount` (expected out) on estimate vs. quote and is an upstream bug, so we can't use that
          // To circumvent that and not mislead users into very optimistic expected out in rate (not taking slippage into account) but pessimistic in rate in the end,
          // we simply add the slippage back to the min out, which yields values very close to the actual quote amounts (with a small upside on the quote, so users actually get a better quote
          // than what they've seen as a rate, which is much better than a *huge* downside on the quote)
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountBeforeSlippageCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit: quoteEstimateResponse.minOutputAmount,
          sellAmountIncludingProtocolFeesCryptoBaseUnit:
            input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            networkFeeCryptoBaseUnit: undefined,
            protocolFees: undefined, // We don't have protocol fees on Portals during the estimate step
          },
          source: SwapperName.Portals,
        },
      ] as SingleHopTradeRateSteps,
    }

    return Ok(tradeRate)
  } catch (err) {
    return Err(
      makeSwapErrorRight({
        message: 'failed to get Portals quote',
        cause: err,
        code: TradeQuoteError.NetworkFeeEstimationFailed,
      }),
    )
  }
}
