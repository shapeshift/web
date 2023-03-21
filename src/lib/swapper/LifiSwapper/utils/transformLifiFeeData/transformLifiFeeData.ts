import type { GasCost, Route, Token } from '@lifi/sdk'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { QuoteFeeData } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero, convertPrecision, toHuman } from 'lib/bignumber/bignumber'
import { LIFI_GAS_FEE_BASE } from 'lib/swapper/LifiSwapper/utils/constants'
import { selectFeeAssetByChainId } from 'state/slices/selectors'
import { store } from 'state/store'

// In cases where gas costs are denominated in tokens other than ETH, gas is better thought of as
// a protocol fee rather than a network fee (gas) due the way our UI assumes gas is always ETH for
// EVM chains.
// To handle this the following is done:
// 1. add all gas costs denominated in `feeAsset` to `networkFeeCryptoBaseUnit`
// 2. add all other gas costs to `buyAssetTradeFeeUsd`
const processGasCosts = (
  chainId: ChainId,
  allRouteGasCosts: GasCost[],
  lifiAssetMap: Map<AssetId, Token>,
  initialSellAssetTradeFeeUsd: BigNumber,
) => {
  const feeAsset = selectFeeAssetByChainId(store.getState(), chainId)

  if (feeAsset === undefined) {
    throw new SwapError('[processGasCosts] a fee asset was not found', {
      code: SwapErrorType.TRADE_QUOTE_FAILED,
      details: { chainId },
    })
  }

  const lifiFeeAsset = lifiAssetMap.get(feeAsset.assetId)

  if (lifiFeeAsset === undefined) {
    throw new SwapError('[processGasCosts] the fee asset does not exist in lifi', {
      code: SwapErrorType.TRADE_QUOTE_FAILED,
      details: { feeAsset },
    })
  }

  const networkFeeCryptoLifiPrecision = allRouteGasCosts
    .filter(gasCost => gasCost.token.address === lifiFeeAsset.address)
    .reduce((acc, gasCost) => acc.plus(bnOrZero(gasCost.amount)), bn(0))

  const networkFeeCryptoBaseUnit = convertPrecision({
    value: networkFeeCryptoLifiPrecision,
    inputPrecision: lifiFeeAsset.decimals,
    outputPrecision: feeAsset.precision,
  })

  const nonFeeAssetGasCosts = allRouteGasCosts
    .filter(gasCost => gasCost.token.address !== lifiFeeAsset?.address)
    .reduce((acc, gasCost) => acc.plus(bnOrZero(gasCost.amountUSD)), bn(0))

  const sellAssetTradeFeeUsd = initialSellAssetTradeFeeUsd.plus(nonFeeAssetGasCosts)

  return { networkFeeCryptoBaseUnit, sellAssetTradeFeeUsd }
}

// NOTE: fees are denoted in the sell asset
export const transformLifiFeeData = ({
  buyAssetAddress,
  chainId,
  lifiAssetMap,
  selectedRoute,
}: {
  buyAssetAddress: string
  chainId: ChainId
  lifiAssetMap: Map<AssetId, Token>
  selectedRoute: Route
}): QuoteFeeData<EvmChainId> => {
  const allRouteGasCosts = selectedRoute.steps.flatMap(step => step.estimate.gasCosts ?? [])
  const allRouteFeeCosts = selectedRoute.steps.flatMap(step => step.estimate.feeCosts ?? [])

  const buyAssetRouteFeeCosts = allRouteFeeCosts.filter(
    feeCost => feeCost.token.address === buyAssetAddress,
  )

  // all fees that are not the buy asset (there may be multiple different tokens)
  const sellAssetRouteFeeCosts = allRouteFeeCosts.filter(
    feeCost => feeCost.token.address !== buyAssetAddress,
  )

  // this is the sum of all `feeCost` against the buy asset in USD
  // need to manually convert them to USD because lifi rounds to the nearest dollar
  const buyAssetTradeFeeUsd =
    buyAssetRouteFeeCosts
      .map(feeCost =>
        toHuman({ value: feeCost.amount, inputPrecision: feeCost.token.decimals }).multipliedBy(
          bnOrZero(feeCost.token.priceUSD),
        ),
      )
      .reduce((acc, amountUsd) => acc.plus(amountUsd), bn(0)) ?? bn(0)

  // this is the sum of all `feeCost` against the sell asset in USD
  // need to manually convert them to USD because lifi rounds to the nearest dollar
  const initialSellAssetTradeFeeUsd =
    sellAssetRouteFeeCosts
      .map(feeCost =>
        toHuman({ value: feeCost.amount, inputPrecision: feeCost.token.decimals }).multipliedBy(
          bnOrZero(feeCost.token.priceUSD),
        ),
      )
      .reduce((acc, amountUsd) => acc.plus(amountUsd), bn(0)) ?? bn(0)

  const { networkFeeCryptoBaseUnit, sellAssetTradeFeeUsd } = processGasCosts(
    chainId,
    allRouteGasCosts,
    lifiAssetMap,
    initialSellAssetTradeFeeUsd,
  )

  // the sum of all 'APPROVE' gas fees
  // TODO: validate this with lifi
  const approvalFeeCryptoBaseUnit =
    allRouteGasCosts
      .filter(gasCost => gasCost.type === 'APPROVE')
      .reduce((a, v) => (v.estimate ? a.plus(bn(v.estimate, LIFI_GAS_FEE_BASE)) : a), bn(0)) ??
    bn(0)

  return {
    networkFeeCryptoBaseUnit: networkFeeCryptoBaseUnit.toString(), // UI shows this next to the gas icon
    chainSpecific: {
      // the following are not required because gas is hardcoded downstream during approval
      // estimatedGas: gas limit for approval
      // gasPriceCryptoBaseUnit: gas price for approval
      approvalFeeCryptoBaseUnit: approvalFeeCryptoBaseUnit.toString(),
    },
    // UI shows the sum of these as "protocol fee"
    buyAssetTradeFeeUsd: buyAssetTradeFeeUsd.toString(),
    sellAssetTradeFeeUsd: sellAssetTradeFeeUsd.toString(),
  }
}
