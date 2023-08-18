import type { ChainKey, LifiError, RoutesRequest } from '@lifi/sdk'
import { LifiErrorCode } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight, SwapSource } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapErrorType, SwapperName } from 'lib/swapper/api'
import { LIFI_INTEGRATOR_ID } from 'lib/swapper/swappers/LifiSwapper/utils/constants'
import { getIntermediaryTransactionOutputs } from 'lib/swapper/swappers/LifiSwapper/utils/getIntermediaryTransactionOutputs/getIntermediaryTransactionOutputs'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
import { getLifiEvmAssetAddress } from 'lib/swapper/swappers/LifiSwapper/utils/getLifiEvmAssetAddress/getLifiEvmAssetAddress'
import { transformLifiStepFeeData } from 'lib/swapper/swappers/LifiSwapper/utils/transformLifiFeeData/transformLifiFeeData'
import type { LifiTool, LifiTradeQuote } from 'lib/swapper/swappers/LifiSwapper/utils/types'

import { getNetworkFeeCryptoBaseUnit } from '../utils/getNetworkFeeCryptoBaseUnit/getNetworkFeeCryptoBaseUnit'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput & { wallet?: HDWallet },
  lifiChainMap: Map<ChainId, ChainKey>,
  lifiToolsMap: Map<string, LifiTool>,
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
    wallet,
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
        slippageTolerancePercentage ?? getDefaultSlippagePercentageForSwapper(SwapperName.LIFI),
      ),
      exchanges: { deny: ['dodo'] },
      // TODO(gomes): We don't currently handle trades that require a mid-trade user-initiated Tx on a different chain
      // i.e we would theoretically handle the Tx itself, but not approvals on said chain if needed
      // use the `allowSwitchChain` param above when implemented
      allowSwitchChain: false,
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

            const buyAmountCryptoBaseUnit = bnOrZero(selectedLifiRoute.toAmountMin)
            const intermediaryTransactionOutputs = getIntermediaryTransactionOutputs(
              assets,
              lifiStep,
            )

            const networkFeeCryptoBaseUnit = await getNetworkFeeCryptoBaseUnit({
              accountNumber,
              chainId,
              lifiStep,
              supportsEIP1559,
              wallet,
            })

            const toolInfo = (() => {
              const _toolInfo = lifiToolsMap.get(lifiStep.tool)
              if (_toolInfo) return _toolInfo

              const { key, name, logoURI } = lifiStep.toolDetails
              lifiToolsMap.set(key, { key, name, logoURI })
              return lifiStep.toolDetails
            })()

            const source: SwapSource = toolInfo
              ? `${SwapperName.LIFI} • ${toolInfo.name}`
              : SwapperName.LIFI

            return {
              allowanceContract: lifiStep.estimate.approvalAddress,
              accountNumber,
              buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit.toString(),
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

        return {
          steps,
          rate: netRate,
          selectedLifiRoute,
        }
      }),
    ),
  )
}
