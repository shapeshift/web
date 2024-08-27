import type { AssetId } from '@shapeshiftoss/caip'
import type { GetFeesReturn } from '@shapeshiftoss/chain-adapters/dist/evm/utils'
import type { SwapErrorRight } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { InboundAddressResponse } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import { isRune } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/utils/isRune/isRune'
import { assetIdToPoolAssetId } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/utils/poolAssetHelpers/poolAssetHelpers'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import { Err, Ok, type Result } from '@sniptt/monads'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { EvmFees } from 'lib/utils/evm'

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
  fees: GetFeesReturn,
  feeAsset: Asset,
  feeAssetMarketData: MarketData,
): EvmFees => {
  const txFeeFiat = bn(fromBaseUnit(fees.networkFeeCryptoBaseUnit, feeAsset.precision))
    .times(feeAssetMarketData.price)
    .toString()

  const { networkFeeCryptoBaseUnit } = fees
  return { fees, txFeeFiat, networkFeeCryptoBaseUnit }
}
