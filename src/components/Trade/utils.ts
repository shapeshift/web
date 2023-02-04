import type { AssetId } from '@shapeshiftoss/caip'
import { getInboundAddressDataForChain, isRune, SwapperName } from '@shapeshiftoss/swapper'
import axios from 'axios'
import { getConfig } from 'config'

export const isTradingActive = async (
  assetId: AssetId | undefined,
  swapperName: SwapperName,
): Promise<boolean> => {
  switch (swapperName) {
    case SwapperName.Thorchain: {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const sellAssetIsRune = assetId && isRune(assetId)
      // no-op if the sell asset is RUNE to save a network call
      const inboundAddressData = sellAssetIsRune
        ? undefined
        : await getInboundAddressDataForChain(daemonUrl, assetId, false)
      /*
      Unless we are trading from RUNE, which has no inbound address data, we MUST
      get confirmation that trading is not halted. We fail-closed for safety.
       */
      switch (true) {
        // The sell asset is RUNE, there is no inbound address data to check against
        // Check the HALTTHORCHAIN flag on the mimir endpoint instead
        case sellAssetIsRune: {
          const { data: mimir } = await axios.get<Record<string, unknown>>(
            `${daemonUrl}/lcd/thorchain/mimir`,
          )
          return Object.entries(mimir).some(([k, v]) => k === 'HALTTHORCHAIN' && v === 0)
        }
        // We have inboundAddressData for the sell asset, check if it is halted
        case !!inboundAddressData:
          return !inboundAddressData!.halted
        // We have no inboundAddressData for the sell asset, fail-closed
        default:
          return false
      }
    }
    // The swapper does not require any additional checks, we assume trading is active
    default:
      return true
  }
}
