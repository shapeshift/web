import type { AssetId } from '@shapeshiftoss/caip'
import type { evm } from '@shapeshiftoss/chain-adapters'
import type { InboundAddressResponse, SwapErrorRight } from '@shapeshiftoss/swapper'
import { assetIdToPoolAssetId, isRune, SwapperName } from '@shapeshiftoss/swapper'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { EvmFees } from '@/hooks/queries/useEvmFees'
import { bn } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'

export const selectInboundAddressData = (
  data: Result<InboundAddressResponse[], SwapErrorRight>,
  assetId: AssetId | undefined,
): InboundAddressResponse | undefined =>
  data
    ?.andThen<InboundAddressResponse | undefined>(data => {
      if (!assetId) return Err(`AssetId is required: ${assetId}` as unknown as SwapErrorRight)

      const assetPoolId = assetIdToPoolAssetId({ assetId })
      const assetChainSymbol = assetPoolId?.slice(0, assetPoolId.indexOf('.'))
      return Ok(data.find(inbound => inbound.chain === assetChainSymbol))
    })
    .unwrap()

export const selectIsTradingActive = ({
  assetId,
  swapperName,
  inboundAddressResponse,
  mimir,
}: {
  assetId: AssetId | undefined
  swapperName: SwapperName
  mimir: Record<string, unknown> | undefined
  inboundAddressResponse: InboundAddressResponse | undefined
}): boolean => {
  switch (swapperName) {
    case SwapperName.Thorchain: {
      if (!assetId) return false

      const sellAssetIsRune = isRune(assetId)

      if (sellAssetIsRune) {
        // The sell asset is RUNE, there is no inbound address data to check against
        // Check the HALTTHORCHAIN flag on the mimir endpoint instead
        return Boolean(
          mimir && Object.entries(mimir).some(([k, v]) => k === 'HALTTHORCHAIN' && v === 0),
        )
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
