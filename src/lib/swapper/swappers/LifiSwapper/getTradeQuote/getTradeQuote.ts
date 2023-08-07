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
import type { GetEvmTradeQuoteInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType, SwapperName } from 'lib/swapper/api'
import {
  LIFI_INTEGRATOR_ID,
  SELECTED_ROUTE_INDEX,
} from 'lib/swapper/swappers/LifiSwapper/utils/constants'
import { getIntermediaryTransactionOutputs } from 'lib/swapper/swappers/LifiSwapper/utils/getIntermediaryTransactionOutputs/getIntermediaryTransactionOutputs'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
import { getLifiEvmAssetAddress } from 'lib/swapper/swappers/LifiSwapper/utils/getLifiEvmAssetAddress/getLifiEvmAssetAddress'
import { getMinimumCryptoHuman } from 'lib/swapper/swappers/LifiSwapper/utils/getMinimumCryptoHuman/getMinimumCryptoHuman'
import { transformLifiStepFeeData } from 'lib/swapper/swappers/LifiSwapper/utils/transformLifiFeeData/transformLifiFeeData'
import type { LifiTradeQuote } from 'lib/swapper/swappers/LifiSwapper/utils/types'

import { getNetworkFeeCryptoBaseUnit } from '../utils/getNetworkFeeCryptoBaseUnit/getNetworkFeeCryptoBaseUnit'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput & { wallet?: HDWallet },
  lifiChainMap: Map<ChainId, ChainKey>,
  assets: Partial<Record<AssetId, Asset>>,
  sellAssetPriceUsdPrecision: string,
): Promise<Result<LifiTradeQuote, SwapErrorRight>> {
  try {
    const {
      chainId,
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit,
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
      throw new SwapError(
        `[getTradeQuote] asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
        { code: SwapErrorType.UNSUPPORTED_PAIR },
      )
    }
    if (buyLifiChainKey === undefined) {
      throw new SwapError(
        `[getTradeQuote] asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
        { code: SwapErrorType.UNSUPPORTED_PAIR },
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
      fromAmount: sellAmountBeforeFeesCryptoBaseUnit,
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
    const routesResponse = await lifi.getRoutes(routesRequest).catch((e: LifiError) => {
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
      throw new SwapError(`[getTradeQuote] ${e.message}`, { code })
    })

    const selectedLifiRoute = routesResponse.routes[SELECTED_ROUTE_INDEX]

    if (selectedLifiRoute === undefined) {
      throw new SwapError('[getTradeQuote] no route found', {
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      })
    }

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
        const intermediaryTransactionOutputs = getIntermediaryTransactionOutputs(assets, lifiStep)

        const networkFeeCryptoBaseUnit = await getNetworkFeeCryptoBaseUnit({
          accountNumber,
          chainId,
          lifiStep,
          supportsEIP1559,
          wallet,
        })

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
          // TODO(woodenfurniture): the rate should be top level not step level
          // might be better replaced by inputOutputRatio downstream
          rate: estimateRate,
          sellAmountBeforeFeesCryptoBaseUnit,
          sellAsset,
          sources: [
            { name: `${selectedLifiRoute.steps[0].tool} (${SwapperName.LIFI})`, proportion: '1' },
          ],
        }
      }),
    )

    const isSameChainSwap = sellAsset.chainId === buyAsset.chainId
    // TODO(gomes): intermediary error-handling within this module function calls
    return Ok({
      minimumCryptoHuman: getMinimumCryptoHuman(
        sellAssetPriceUsdPrecision,
        isSameChainSwap,
      ).toString(),
      steps,
      selectedLifiRoute,
    })
  } catch (e) {
    // TODO(gomes): this is a temporary shim from the old error handling to monads, remove try/catch
    if (e instanceof SwapError)
      return Err(
        makeSwapErrorRight({
          message: e.message,
          code: e.code,
          details: e.details,
        }),
      )
    return Err(
      makeSwapErrorRight({
        message: '[getTradeQuote]',
        cause: e,
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      }),
    )
  }
}
