import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bn, bnOrZero, convertBasisPointsToDecimalPercentage } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'
import type { Address, Hex } from 'viem'
import { getAddress, zeroAddress } from 'viem'

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
import { simulateWithStateOverrides } from '../../../utils/tenderly'
import { getTreasuryAddressFromChainId, isNativeEvmAsset } from '../../utils/helpers/helpers'
import { chainIdToPortalsNetwork } from '../constants'
import { fetchPortalsTradeEstimate, fetchPortalsTradeOrder } from '../utils/fetchPortalsTradeOrder'
import { getPortalsRouterAddressByChainId, isSupportedChainId } from '../utils/helpers'

export async function getPortalsTradeRate(
  input: GetEvmTradeRateInput,
  assertGetEvmChainAdapter: (chainId: ChainId) => EvmChainAdapter,
  swapperConfig: SwapperConfig,
): Promise<Result<TradeRate, SwapErrorRight>> {
  const {
    sellAsset,
    buyAsset,
    accountNumber,
    affiliateBps,
    chainId,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    receiveAddress,
    supportsEIP1559,
  } = input
  const adapter = assertGetEvmChainAdapter(chainId)

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
      ? bnOrZero(input.slippageTolerancePercentageDecimal).times(100).toNumber()
      : bnOrZero(getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Portals))
          .times(100)
          .toNumber()

    // Calculate affiliate fee percentage (e.g., 55 bps = 0.55%)
    const affiliateBpsPercentage = convertBasisPointsToDecimalPercentage(affiliateBps)
      .times(100)
      .toNumber()

    // Dummy address for rates (no wallet connected yet)
    // Using Vitalik's address as a realistic test address (same approach as Bebop)
    const RATE_DUMMY_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

    // Use full quote endpoint (not estimate) to get transaction data for Tenderly simulation
    // Skip validation since this is just a rate quote
    const quoteResponse = await fetchPortalsTradeOrder({
      sender: RATE_DUMMY_ADDRESS, // Dummy address for rates (no wallet yet)
      inputToken,
      outputToken,
      inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
      slippageTolerancePercentage: userSlippageTolerancePercentageDecimalOrDefault,
      partner: getTreasuryAddressFromChainId(chainId),
      feePercentage: affiliateBpsPercentage,
      validate: false, // Skip Portals' simulation validation
      swapperConfig,
    })

    if (!quoteResponse.tx) {
      throw new Error('Portals quote response missing transaction data')
    }

    const { context, tx } = quoteResponse

    // Use outputAmount from context, not estimate
    const buyAmountAfterFeesCryptoBaseUnit = context.outputAmount

    const inputOutputRate = getInputOutputRate({
      sellAmountCryptoBaseUnit: input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })

    const allowanceContract = getPortalsRouterAddressByChainId(chainId)

    // Don't use Portals' slippageTolerancePercentage field (it's a price indicator, not actual buffer)
    // Instead, calculate the actual buffer Portals applied from the amounts
    const actualBufferDecimal = bnOrZero(context.outputAmount)
      .minus(context.minOutputAmount)
      .div(context.outputAmount)
      .toString()

    // Reverse the buffer to recover the expected output (minOutput / (1 - buffer) = output)
    const buyAmountBeforeSlippageCryptoBaseUnit = bnOrZero(context.minOutputAmount)
      .div(bn(1).minus(actualBufferDecimal))
      .toFixed(0)

    const slippageTolerancePercentageDecimal = actualBufferDecimal

    const gasLimit = await (async () => {
      const tenderlySimulation = await simulateWithStateOverrides(
        {
          chainId: sellAsset.chainId,
          from: tx.from,
          to: tx.to,
          data: tx.data as Hex,
          value: tx.value,
          sellAsset,
          spenderAddress: getAddress(context.target),
        },
        {
          apiKey: swapperConfig.VITE_TENDERLY_API_KEY,
          accountSlug: swapperConfig.VITE_TENDERLY_ACCOUNT_SLUG,
          projectSlug: swapperConfig.VITE_TENDERLY_PROJECT_SLUG,
        },
      )

      if (tenderlySimulation.success) {
        return tenderlySimulation.gasLimit.toString()
      }

      // Fallback to estimate endpoint (i.e simulation with overrides failed, but Portals still able to do their magic here)
      const quoteEstimateResponse = await fetchPortalsTradeEstimate({
        inputToken,
        outputToken,
        inputAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
        slippageTolerancePercentage: userSlippageTolerancePercentageDecimalOrDefault,
        swapperConfig,
      })

      return quoteEstimateResponse.context.gasLimit.toString()
    })()

    const { average } = await adapter.getGasFeeData()

    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559: Boolean(supportsEIP1559),
      gasLimit,
    })

    const tradeRate = {
      id: uuid(),
      quoteOrRate: 'rate' as const,
      accountNumber,
      receiveAddress,
      affiliateBps,
      rate: inputOutputRate,
      slippageTolerancePercentageDecimal,
      swapperName: SwapperName.Portals,
      steps: [
        {
          // Assume instant execution since this is a same-chain AMM Tx which will happen within the same block
          estimatedExecutionTimeMs: 0,
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
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit:
            input.sellAmountIncludingProtocolFeesCryptoBaseUnit,
          feeData: {
            networkFeeCryptoBaseUnit,
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
