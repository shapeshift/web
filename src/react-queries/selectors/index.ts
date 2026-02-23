import type { AssetId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/chain-adapters'
import type { InboundAddressResponse } from '@shapeshiftoss/swapper'
import {
  assetIdToMayaPoolAssetId,
  assetIdToThorPoolAssetId,
  isNativeAsset,
  isRuji,
  isTcy,
  SwapperName,
} from '@shapeshiftoss/swapper'
import type { Asset, MarketData } from '@shapeshiftoss/types'

import type { EvmFees } from '@/hooks/queries/useEvmFees'
import { bn } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import type { ThorchainMimir } from '@/lib/utils/thorchain/types'

export const selectInboundAddressData = (
  data: InboundAddressResponse[],
  assetId: AssetId | undefined,
  swapperName: SwapperName,
): InboundAddressResponse | undefined => {
  if (!assetId) throw new Error(`AssetId is required: ${assetId}`)

  const assetPoolId = (() => {
    switch (swapperName) {
      case SwapperName.Thorchain:
        return assetIdToThorPoolAssetId({ assetId })
      case SwapperName.Mayachain:
        return assetIdToMayaPoolAssetId({ assetId })
      default:
        throw new Error(`Invalid swapper name: ${swapperName}`)
    }
  })()

  const assetChainSymbol = assetPoolId?.slice(0, assetPoolId.indexOf('.'))

  return data.find(inbound => inbound.chain === assetChainSymbol)
}

export const selectIsTradingActive = ({
  assetId,
  swapperName,
  inboundAddressResponse,
  mimir,
}: {
  assetId: AssetId | undefined
  swapperName: SwapperName
  mimir: ThorchainMimir | undefined
  inboundAddressResponse: InboundAddressResponse | undefined
}): boolean => {
  switch (swapperName) {
    case SwapperName.Thorchain:
    case SwapperName.Mayachain: {
      if (!assetId) return false

      const isNativeFeeAsset = isNativeAsset(assetId, swapperName)
      const isNonFeeNativeAsset = isTcy(assetId) || isRuji(assetId)

      if (isNativeFeeAsset) {
        // The asset is native (RUNE/CACAO), there is no inbound address data to check against
        // Check the HALTTHORCHAIN flag on the mimir endpoint instead
        return Boolean(mimir && mimir.HALTTHORCHAIN === 0)
      }

      if (isNonFeeNativeAsset) {
        // The asset is TCY, there is no inbound address data to check against
        // Check the HALTTCYTRADING flag on the mimir endpoint instead
        return Boolean(mimir && mimir.HALTTCYTRADING === 0)
      }

      // We have inboundAddressData for the sell asset, check if it is halted
      if (inboundAddressResponse) {
        return !inboundAddressResponse.halted
      }

      // We have no inboundAddressData for the sell asset, fail-closed
      return false
    }
    // The swapper does not require any additional checks, we assume trading is active
    default:
      return true
  }
}

export const selectEvmFees = (
  fees: evm.Fees,
  feeAsset: Asset,
  feeAssetMarketData: MarketData,
): EvmFees => {
  const txFeeFiat = bn(fromBaseUnit(fees.networkFeeCryptoBaseUnit, feeAsset.precision))
    .times(feeAssetMarketData.price)
    .toString()

  const { networkFeeCryptoBaseUnit } = fees
  return { fees, txFeeFiat, networkFeeCryptoBaseUnit }
}
