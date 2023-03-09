import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { store } from 'state/store'

import { getMixPanel } from './mixPanelSingleton'
import type { MixPanelEvents, trackOpportunityProps } from './types'

// TODO(0xdef1cafe): refactor to selector that returns Record<AssetId, string> where string is the composite symbol
export const getMaybeCompositeAssetSymbol = (assetId: AssetId) => {
  const asset = store.getState().assets.byId[assetId]
  const { chainId } = fromAssetId(assetId)
  const networkName = getChainAdapterManager().get(chainId)?.getDisplayName()
  return `${networkName}.${asset?.symbol}`
}

export const trackOpportunityEvent = (event: MixPanelEvents, properties: trackOpportunityProps) => {
  const mixpanel = getMixPanel()
  const { opportunity, cryptoAmounts, fiatAmounts } = properties
  const eventData = {
    provider: opportunity.provider,
    type: opportunity.type,
    version: opportunity.version,
    assets: opportunity.underlyingAssetIds.map(getMaybeCompositeAssetSymbol),
    fiatAmounts: fiatAmounts.map(fiatAmount => bnOrZero(fiatAmount).toNumber()),
    ...Object.fromEntries(
      cryptoAmounts.map(claimAmount => [
        getMaybeCompositeAssetSymbol(claimAmount.assetId),
        claimAmount.amountCryptoHuman,
      ]),
    ),
  }
  mixpanel?.track(event, eventData)
}
