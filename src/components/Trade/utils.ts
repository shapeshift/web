import type { AssetId } from '@shapeshiftoss/caip'
import { getInboundAddressDataForChain, SwapperName } from '@shapeshiftoss/swapper'
import { getConfig } from 'config'

export const isTradingActive = async (
  assetId: AssetId | undefined,
  swapperName: SwapperName,
): Promise<boolean> => {
  switch (swapperName) {
    case SwapperName.Thorchain: {
      const daemonUrl = getConfig().REACT_APP_THORCHAIN_NODE_URL
      const inboundAddressData = await getInboundAddressDataForChain(daemonUrl, assetId, false)
      // If we can't get inbound address data, we MUST assume trading is halted for safety
      return inboundAddressData ? !inboundAddressData.halted : false
    }
    default:
      return true
  }
}
