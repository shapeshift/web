import type { ChainKey, LifiError, RoutesRequest } from '@lifi/sdk'
import { LifiErrorCode } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getDefaultSlippageDecimalPercentageForSwapper } from 'constants/constants'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { LIFI_INTEGRATOR_ID } from 'lib/swapper/swappers/LifiSwapper/utils/constants'
import { getIntermediaryTransactionOutputs } from 'lib/swapper/swappers/LifiSwapper/utils/getIntermediaryTransactionOutputs/getIntermediaryTransactionOutputs'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
import { getLifiEvmAssetAddress } from 'lib/swapper/swappers/LifiSwapper/utils/getLifiEvmAssetAddress/getLifiEvmAssetAddress'
import { transformLifiStepFeeData } from 'lib/swapper/swappers/LifiSwapper/utils/transformLifiFeeData/transformLifiFeeData'
import type { LifiTradeQuote } from 'lib/swapper/swappers/LifiSwapper/utils/types'
import type { GetEvmTradeQuoteInput, SwapErrorRight, SwapSource } from 'lib/swapper/types'
import { SwapErrorType, SwapperName } from 'lib/swapper/types'
import { makeSwapErrorRight } from 'lib/swapper/utils'
import { convertBasisPointsToDecimalPercentage } from 'state/slices/tradeQuoteSlice/utils'

import { getNetworkFeeCryptoBaseUnit } from '../utils/getNetworkFeeCryptoBaseUnit/getNetworkFeeCryptoBaseUnit'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
  lifiChainMap: Map<ChainId, ChainKey>,
  assets: Partial<Record<AssetId, Asset>>,
): Promise<Result<LifiTradeQuote[], SwapErrorRight>> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit,
    sendAddress,
    receiveAddress,
    accountNumber,
    slippageTolerancePercentage,
    supportsEIP1559,
    affiliateBps,
  } = input

  const sellLifiChainKey = lifiChainMap.get(sellAsset.chainId)
  const buyLifiChainKey = lifiChainMap.get(buyAsset.chainId)

  if (sellLifiChainKey === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
      }),
    )
  }
  if (buyLifiChainKey === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
        code: SwapErrorType.UNSUPPORTED_PAIR,
      }),
    )
  }

  const lifi = getLifi()

  const routesRequest: RoutesRequest = {
    fromChainId: Number(fromChainId(sellAsset.chainId).chainReference),
    toChainId: Number(fromChainId(buyAsset.chainId).chainReference),
    fromTokenAddress: getLifiEvmAssetAddress(sellAsset),
    toTokenAddress: getLifiEvmAssetAddress(buyAsset),
    // HACK: use the receive address as the send address
    // lifi's exchanges may use this to check allowance on their side
    // this swapper is not cross-account so this works
    fromAddress: sendAddress,
    toAddress: receiveAddress,
    fromAmount: sellAmountIncludingProtocolFeesCryptoBaseUnit,
    // as recommended by lifi, dodo is denied until they fix their gas estimates
    // TODO: convert this config to .env variable
    options: {
      // used for analytics and donations - do not change this without considering impact
      integrator: LIFI_INTEGRATOR_ID,
      slippage: Number(
        slippageTolerancePercentage ??
          getDefaultSlippageDecimalPercentageForSwapper(SwapperName.LIFI),
      ),
      exchanges: { deny: ['dodo'] },
      // TODO(gomes): We don't currently handle trades that require a mid-trade user-initiated Tx on a different chain
      // i.e we would theoretically handle the Tx itself, but not approvals on said chain if needed
      // use the `allowSwitchChain` param above when implemented
      allowSwitchChain: false,
      fee: convertBasisPointsToDecimalPercentage(affiliateBps).toNumber(),
    },
  }

  // getMixPanel()?.track(MixPanelEvents.SwapperApiRequest, {
  //   swapper: SwapperName.LIFI,
  //   method: 'get',
  //   // Note, this may change if the Li.Fi SDK changes
  //   url: 'https://li.quest/v1/advanced/routes',
  // })
  const routesResponse = await lifi
    .getRoutes(routesRequest)
    .then(response => Ok(response))
    .catch((e: LifiError) => {
      const code = (() => {
        switch (e.code) {
          case LifiErrorCode.ValidationError:
            return SwapErrorType.VALIDATION_FAILED
          case LifiErrorCode.InternalError:
          case LifiErrorCode.Timeout:
            return SwapErrorType.RESPONSE_ERROR
          default:
            return SwapErrorType.TRADE_QUOTE_FAILED
        }
      })()
      return Err(
        makeSwapErrorRight({
          message: e.message,
          code,
        }),
      )
    })

  if (routesResponse.isErr()) return Err(routesResponse.unwrapErr())

  const { routes } = routesResponse.unwrap()

  if (routes.length === 0) {
    return Err(
      makeSwapErrorRight({
        message: 'no route found',
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  }

  return Ok(
    await Promise.all(
      routes.slice(0, 3).map(async selectedLifiRoute => {
        // this corresponds to a "hop", so we could map the below code over selectedLifiRoute.steps to
        // generate a multi-hop quote
        const steps = await Promise.all(
          selectedLifiRoute.steps.map(async lifiStep => {
            // for the rate to be valid, both amounts must be converted to the same precision
            const estimateRate = convertPrecision({
              value: selectedLifiRoute.toAmountMin,
              inputExponent: buyAsset.precision,
              outputExponent: sellAsset.precision,
            })
              .dividedBy(bn(selectedLifiRoute.fromAmount))
              .toString()

            const protocolFees = transformLifiStepFeeData({
              chainId,
              lifiStep,
              assets,
            })

            const sellAssetProtocolFee = protocolFees[sellAsset.assetId]
            const buyAssetProtocolFee = protocolFees[buyAsset.assetId]
            const sellSideProtocolFeeCryptoBaseUnit = bnOrZero(
              sellAssetProtocolFee?.amountCryptoBaseUnit,
            )
            const sellSideProtocolFeeBuyAssetBaseUnit = bnOrZero(
              convertPrecision({
                value: sellSideProtocolFeeCryptoBaseUnit,
                inputExponent: sellAsset.precision,
                outputExponent: buyAsset.precision,
              }),
            ).times(estimateRate)
            const buySideProtocolFeeCryptoBaseUnit = bnOrZero(
              buyAssetProtocolFee?.amountCryptoBaseUnit,
            )

            const buyAmountAfterFeesCryptoBaseUnit = bnOrZero(
              selectedLifiRoute.toAmount,
            ).toPrecision()

            // TODO: Add buySideNetworkFeeCryptoBaseUnit when we implement multihop
            const buyAmountBeforeFeesCryptoBaseUnit = bnOrZero(buyAmountAfterFeesCryptoBaseUnit)
              .plus(sellSideProtocolFeeBuyAssetBaseUnit)
              .plus(buySideProtocolFeeCryptoBaseUnit)
              .toString()

            const intermediaryTransactionOutputs = getIntermediaryTransactionOutputs(
              assets,
              lifiStep,
            )

            const networkFeeCryptoBaseUnit = await getNetworkFeeCryptoBaseUnit({
              chainId,
              lifiStep,
              supportsEIP1559,
            })

            const source: SwapSource = `${SwapperName.LIFI} • ${lifiStep.toolDetails.name}`

            return {
              allowanceContract: lifiStep.estimate.approvalAddress,
              accountNumber,
              buyAmountBeforeFeesCryptoBaseUnit,
              buyAmountAfterFeesCryptoBaseUnit,
              buyAsset,
              intermediaryTransactionOutputs,
              feeData: {
                protocolFees,
                networkFeeCryptoBaseUnit,
              },
              // TODO(woodenfurniture):  this step-level key should be a step-level value, rather than the top-level rate.
              // might be better replaced by inputOutputRatio downstream
              rate: estimateRate,
              sellAmountIncludingProtocolFeesCryptoBaseUnit,
              sellAsset,
              source,
            }
          }),
        )

        // The rate for the entire multi-hop swap
        const netRate = convertPrecision({
          value: selectedLifiRoute.toAmountMin,
          inputExponent: buyAsset.precision,
          outputExponent: sellAsset.precision,
        })
          .dividedBy(bn(selectedLifiRoute.fromAmount))
          .toString()

        const estimatedExecutionTimeMs = selectedLifiRoute.steps.reduce(
          (acc, step) => acc + 1000 * step.estimate.executionDuration,
          0,
        )

        return {
          id: selectedLifiRoute.id,
          receiveAddress,
          affiliateBps,
          steps,
          rate: netRate,
          estimatedExecutionTimeMs,
          selectedLifiRoute,
        }
      }),
    ),
  )
}
