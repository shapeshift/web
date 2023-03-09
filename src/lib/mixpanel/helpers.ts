import type { Asset, AssetsById } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { logger } from 'lib/logger'

import { getMixPanel } from './mixPanelSingleton'
import type { MixPanelEvents, trackOpportunityProps } from './types'

const moduleLogger = logger.child({ namespace: ['UnderlyingToken'] })

export const assetToCompositeSymbol = (asset: Asset): string => {
  const { chainId } = asset
  const networkName = getChainAdapterManager().get(chainId)?.getDisplayName()
  return `${networkName}.${asset?.symbol}`
}

export const getMaybeCompositeAssetSymbol = (assetId: AssetId, assetsById?: AssetsById): string => {
  // TODO(0xdef1cafe): delete once trackOpportunityEvent is called with assetsById everywhere
  if (!assetsById) {
    moduleLogger.error('trackOpportunityEvent called without assetsById')
    return 'unknown asset'
  }
  const asset = assetsById[assetId]
  if (!asset) return assetId // better than 'unknown asset'
  return assetToCompositeSymbol(asset)
}

export const trackOpportunityEvent = (
  event: MixPanelEvents,
  properties: trackOpportunityProps,
  assetsById?: AssetsById,
) => {
  // TODO(0xdef1cafe): delete once trackOpportunityEvent is called with assetsById everywhere
  if (!assetsById) {
    moduleLogger.error('trackOpportunityEvent called without assetsById')
    return
  }
  const mixpanel = getMixPanel()
  const { opportunity, cryptoAmounts, fiatAmounts } = properties
  const eventData = {
    provider: opportunity.provider,
    type: opportunity.type,
    version: opportunity.version,
    assets: opportunity.underlyingAssetIds.map(assetId =>
      getMaybeCompositeAssetSymbol(assetId, assetsById),
    ),
    fiatAmounts: fiatAmounts.map(fiatAmount => bnOrZero(fiatAmount).toNumber()),
    ...Object.fromEntries(
      cryptoAmounts.map(claimAmount => [
        getMaybeCompositeAssetSymbol(claimAmount.assetId, assetsById),
        claimAmount.amountCryptoHuman,
      ]),
    ),
  }
  mixpanel?.track(event, eventData)
}
