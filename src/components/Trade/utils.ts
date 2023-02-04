import type { AssetId } from '@shapeshiftoss/caip'
import { getInboundAddressDataForChain, isRune, SwapperName } from '@shapeshiftoss/swapper'
import { getConfig } from 'config'

export const isTradingActive = async (
  assetId: AssetId | undefined,
  swapperName: SwapperName,
): Promise<boolean> => {
  switch (swapperName) {
    case SwapperName.Thorchain: {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const inboundAddressData = await getInboundAddressDataForChain(daemonUrl, assetId, false)
      /*
      Unless we are trading from RUNE, which has no inbound address data, we MUST
      get confirmation that trading is not halted. We fail-closed for safety.
       */
      switch (true) {
        // The sell asset is RUNE, there is no inbound address data to check against
        case assetId && isRune(assetId):
          return true
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
