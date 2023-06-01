import type { ChainKey, LifiError, RoutesRequest } from '@lifi/sdk'
import { LifiErrorCode } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import { BigNumber, bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import type { GetEvmTradeQuoteInput, SwapErrorRight } from 'lib/swapper/api'
import { makeSwapErrorRight, SwapError, SwapErrorType, SwapperName } from 'lib/swapper/api'
import {
  LIFI_INTEGRATOR_ID,
  MAX_LIFI_TRADE,
  SELECTED_ROUTE_INDEX,
} from 'lib/swapper/swappers/LifiSwapper/utils/constants'
import { getIntermediaryTransactionOutputs } from 'lib/swapper/swappers/LifiSwapper/utils/getIntermediaryTransactionOutputs/getIntermediaryTransactionOutputs'
import { getLifi } from 'lib/swapper/swappers/LifiSwapper/utils/getLifi'
import { getLifiEvmAssetAddress } from 'lib/swapper/swappers/LifiSwapper/utils/getLifiEvmAssetAddress/getLifiEvmAssetAddress'
import { getMinimumCryptoHuman } from 'lib/swapper/swappers/LifiSwapper/utils/getMinimumCryptoHuman/getMinimumCryptoHuman'
import { transformLifiFeeData } from 'lib/swapper/swappers/LifiSwapper/utils/transformLifiFeeData/transformLifiFeeData'
import type { LifiTradeQuote } from 'lib/swapper/swappers/LifiSwapper/utils/types'
import { convertBasisPointsToDecimalPercentage } from 'state/zustand/swapperStore/utils'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
  lifiChainMap: Map<ChainId, ChainKey>,
): Promise<Result<LifiTradeQuote<false>, SwapErrorRight>> {
  try {
    const {
      chainId,
      sellAsset,
      buyAsset,
      sellAmountBeforeFeesCryptoBaseUnit,
      receiveAddress,
      accountNumber,
      affiliateBps,
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
        // used for analytics and donations - do not change this without considering impact
        integrator: LIFI_INTEGRATOR_ID,
        fee: convertBasisPointsToDecimalPercentage(affiliateBps).toNumber(),
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

    // for the rate to be valid, both amounts must be converted to the same precision
    const estimateRate = convertPrecision({
      value: selectedLifiRoute.toAmountMin,
      inputExponent: buyAsset.precision,
      outputExponent: sellAsset.precision,
    })
      .dividedBy(bn(selectedLifiRoute.fromAmount))
      .toString()

    const allowanceContract = (() => {
      const uniqueApprovalAddresses = new Set(
        selectedLifiRoute.steps
          .map(step => step.estimate.approvalAddress)
          .filter(approvalAddress => approvalAddress !== undefined),
      )

      if (uniqueApprovalAddresses.size !== 1) {
        throw new SwapError(
          `[getTradeQuote] expected exactly 1 approval address, found ${uniqueApprovalAddresses.size}`,
          {
            code: SwapErrorType.TRADE_QUOTE_FAILED,
          },
        )
      }

      return [...uniqueApprovalAddresses.values()][0]
    })()

    const maxSlippage = BigNumber.max(...selectedLifiRoute.steps.map(step => step.action.slippage))

    const feeData = transformLifiFeeData({
      buyAsset,
      chainId,
      selectedRoute: selectedLifiRoute,
    })

    const buyAmountCryptoBaseUnit = bnOrZero(selectedLifiRoute.toAmountMin)
    const intermediaryTransactionOutputs = getIntermediaryTransactionOutputs(
      selectedLifiRoute.steps,
    )

    // TODO(gomes): intermediary error-handling within this module function calls
    return Ok({
      accountNumber,
      allowanceContract,
      buyAmountBeforeFeesCryptoBaseUnit: buyAmountCryptoBaseUnit.toString(),
      buyAsset,
      intermediaryTransactionOutputs,
      feeData,
      maximumCryptoHuman: MAX_LIFI_TRADE,
      minimumCryptoHuman: getMinimumCryptoHuman(sellAsset).toString(),
      rate: estimateRate,
      recommendedSlippage: maxSlippage.toString(),
      sellAmountBeforeFeesCryptoBaseUnit,
      sellAsset,
      sources: [
        { name: `${selectedLifiRoute.steps[0].tool} (${SwapperName.LIFI})`, proportion: '1' },
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
