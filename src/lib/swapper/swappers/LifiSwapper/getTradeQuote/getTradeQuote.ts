import type { ChainKey, LifiError, RoutesRequest } from '@lifi/sdk'
import { LifiErrorCode } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import { DAO_TREASURY_ETHEREUM_MAINNET } from 'constants/treasury'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType, SwapperName } from 'lib/swapper/api'
import { SELECTED_ROUTE_INDEX } from 'lib/swapper/swappers/LifiSwapper/utils/constants'
import { getIntermediaryTransactionOutputs } from 'lib/swapper/swappers/LifiSwapper/utils/getIntermediaryTransactionOutputs/getIntermediaryTransactionOutputs'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
import { getLifiEvmAssetAddress } from 'lib/swapper/swappers/LifiSwapper/utils/getLifiEvmAssetAddress/getLifiEvmAssetAddress'
import { getMinimumCryptoHuman } from 'lib/swapper/swappers/LifiSwapper/utils/getMinimumCryptoHuman/getMinimumCryptoHuman'
import { transformLifiStepFeeData } from 'lib/swapper/swappers/LifiSwapper/utils/transformLifiFeeData/transformLifiFeeData'
import type { LifiTradeQuote } from 'lib/swapper/swappers/LifiSwapper/utils/types'

import { getLifiChainMap } from '../utils/getLifiChainMap'
import { getNetworkFeeCryptoBaseUnit } from '../utils/getNetworkFeeCryptoBaseUnit/getNetworkFeeCryptoBaseUnit'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
  lifiChainMap: Map<ChainId, ChainKey>,
  assets: Partial<Record<AssetId, Asset>>,
  sellAssetPriceUsdPrecision: string,
): Promise<Result<LifiTradeQuote<false>, SwapErrorRight>> {
  try {
    const {
      chainId,
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit,
      receiveAddress,
      accountNumber,
    } = input

    const sellLifiChainKey = lifiChainMap.get(sellAsset.chainId)
    const buyLifiChainKey = lifiChainMap.get(buyAsset.chainId)

    const defaultLifiSwapperSlippage = getDefaultSlippagePercentageForSwapper(SwapperName.LIFI)

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
    if (sellLifiChainKey === buyLifiChainKey) {
      throw new SwapError('[getTradeQuote] same chains swaps not supported', {
        code: SwapErrorType.UNSUPPORTED_PAIR,
      })
    }

    const lifi = getLifi()

    const routesRequest: RoutesRequest = {
      fromChainId: Number(fromChainId(sellAsset.chainId).chainReference),
      toChainId: Number(fromChainId(buyAsset.chainId).chainReference),
      fromTokenAddress: getLifiEvmAssetAddress(sellAsset),
      toTokenAddress: getLifiEvmAssetAddress(buyAsset),
      fromAddress: receiveAddress,
      toAddress: receiveAddress,
      fromAmount: sellAmountBeforeFeesCryptoBaseUnit,
      // as recommended by lifi, dodo is denied until they fix their gas estimates
      // TODO: convert this config to .env variable
      options: {
        // used for analytics - do not change this without considering impact
        integrator: DAO_TREASURY_ETHEREUM_MAINNET,
        slippage: Number(defaultLifiSwapperSlippage),
        exchanges: { deny: ['dodo'] },
        // as recommended by lifi, allowSwitchChain must be false to ensure single-hop transactions.
        // This must remain disabled until our application supports multi-hop swaps
        allowSwitchChain: false,
      },
    }

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

    if (selectedLifiRoute.steps.length !== 1) {
      throw new SwapError('[getTradeQuote] multi hop trades not currently supported', {
        code: SwapErrorType.TRADE_QUOTE_FAILED,
      })
    }

    // this corresponds to a "hop", so we could map the below code over selectedLifiRoute.steps to
    // generate a multi-hop quote
    const lifiStep = selectedLifiRoute.steps[0]

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
      chainId,
      lifiStep,
    })

    // TODO(gomes): intermediary error-handling within this module function calls
    return Ok({
      minimumCryptoHuman: getMinimumCryptoHuman(sellAssetPriceUsdPrecision).toString(),
      recommendedSlippage: lifiStep.action.slippage.toString(),
      steps: [
        {
          allowanceContract: lifiStep.estimate.approvalAddress,
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit.toString(),
          buyAsset,
          intermediaryTransactionOutputs,
          feeData: {
            protocolFees,
            networkFeeCryptoBaseUnit,
          },
          rate: estimateRate,
          sellAmountBeforeFeesCryptoBaseUnit,
          sellAsset,
          sources: [
            { name: `${selectedLifiRoute.steps[0].tool} (${SwapperName.LIFI})`, proportion: '1' },
          ],
        },
      ],
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

let lifiChainMapPromise: Promise<Result<Map<ChainId, ChainKey>, SwapErrorRight>> | undefined

// TODO(woodenfurniture): this function and its singletons should be moved elsewhere once we have
// more visibility on the pattern for multi-hop swappers
export const getLifiTradeQuote = async (
  input: GetEvmTradeQuoteInput,
  assets: Partial<Record<AssetId, Asset>>,
  sellAssetPriceUsdPrecision: string,
): Promise<Result<LifiTradeQuote<false>, SwapErrorRight>> => {
  if (lifiChainMapPromise === undefined) lifiChainMapPromise = getLifiChainMap()

  const maybeLifiChainMap = await lifiChainMapPromise

  if (maybeLifiChainMap.isErr()) return Err(maybeLifiChainMap.unwrapErr())

  return getTradeQuote(input, maybeLifiChainMap.unwrap(), assets, sellAssetPriceUsdPrecision)
}
