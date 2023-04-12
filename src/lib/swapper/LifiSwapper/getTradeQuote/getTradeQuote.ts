import type { ChainKey, LifiError, RoutesRequest, Token as LifiToken } from '@lifi/sdk'
import { LifiErrorCode } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromChainId } from '@shapeshiftoss/caip'
import type { GetEvmTradeQuoteInput } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType, SwapperName } from '@shapeshiftoss/swapper'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import { BigNumber, bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { MAX_LIFI_TRADE, SELECTED_ROUTE_INDEX } from 'lib/swapper/LifiSwapper/utils/constants'
import { getAssetBalance } from 'lib/swapper/LifiSwapper/utils/getAssetBalance/getAssetBalance'
import { getLifi } from 'lib/swapper/LifiSwapper/utils/getLifi'
import { transformLifiFeeData } from 'lib/swapper/LifiSwapper/utils/transformLifiFeeData/transformLifiFeeData'
import type { LifiTradeQuote } from 'lib/swapper/LifiSwapper/utils/types'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
  lifiAssetMap: Map<AssetId, LifiToken>,
  lifiChainMap: Map<ChainId, ChainKey>,
): Promise<LifiTradeQuote> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit,
    sendMax,
    receiveAddress,
    accountNumber,
  } = input

  const sellLifiChainKey = lifiChainMap.get(sellAsset.chainId)
  const buyLifiChainKey = lifiChainMap.get(buyAsset.chainId)
  const sellLifiToken = lifiAssetMap.get(sellAsset.assetId)
  const buyLifiToken = lifiAssetMap.get(buyAsset.assetId)

  if (sellLifiChainKey === undefined || sellLifiToken === undefined) {
    throw new SwapError(
      `[getTradeQuote] asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
      { code: SwapErrorType.UNSUPPORTED_PAIR },
    )
  }
  if (buyLifiChainKey === undefined || buyLifiToken === undefined) {
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

  const fromAmountCryptoLifiPrecision: BigNumber = sendMax
    ? getAssetBalance({
        asset: sellAsset,
        accountNumber,
        chainId,
        outputPrecision: sellLifiToken.decimals,
      })
    : convertPrecision({
        value: sellAmountBeforeFeesCryptoBaseUnit,
        inputPrecision: sellAsset.precision,
        outputPrecision: sellLifiToken.decimals,
      })

  const lifi = getLifi()

  const routesRequest: RoutesRequest = {
    fromChainId: Number(fromChainId(sellAsset.chainId).chainReference),
    toChainId: Number(fromChainId(buyAsset.chainId).chainReference),
    fromTokenAddress: sellLifiToken.address,
    toTokenAddress: buyLifiToken.address,
    fromAddress: receiveAddress,
    toAddress: receiveAddress,
    fromAmount: fromAmountCryptoLifiPrecision.toString(),
    // as recommended by lifi, dodo is denied until they fix their gas estimates
    // TODO: convert this config to .env variable
    options: {
      slippage: Number(DEFAULT_SLIPPAGE),
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

  const minimumCryptoHuman = '0'

  // for the rate to be valid, both amounts must be converted to the same precision
  const estimateRate = convertPrecision({
    value: selectedLifiRoute.toAmountMin,
    inputPrecision: buyLifiToken.decimals,
    outputPrecision: sellLifiToken.decimals,
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
    buyLifiToken,
    chainId,
    lifiAssetMap,
    selectedRoute: selectedLifiRoute,
  })

  return {
    accountNumber,
    allowanceContract,
    buyAmountCryptoBaseUnit: bnOrZero(selectedLifiRoute.toAmountMin).toString(),
    buyAsset,
    feeData,
    maximum: MAX_LIFI_TRADE,
    minimumCryptoHuman,
    rate: estimateRate,
    recommendedSlippage: maxSlippage.toString(),
    sellAmountBeforeFeesCryptoBaseUnit,
    sellAsset,
    sources: [
      { name: `${selectedLifiRoute.steps[0].tool} (${SwapperName.LIFI})`, proportion: '1' },
    ],
    selectedLifiRoute,
  }
}
