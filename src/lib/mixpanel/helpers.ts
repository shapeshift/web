import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

import { getMixPanel } from './mixPanelSingleton'
import type { MixPanelEvents, trackOpportunityProps } from './types'

export const getMaybeCompositeAssetSymbol = (assetId: AssetId) => {
  const asset = selectAssetById(store.getState(), assetId)
  if (!asset) return assetId
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
