import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial } from '@shapeshiftoss/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { getMixPanel } from './mixPanelSingleton'
import type { MixPanelEvent, TrackOpportunityProps } from './types'

// Returns an altered path when necessary or null if the path should not be tracked for privacy
export const mapMixpanelPathname = (pathname: string, assets: AssetsByIdPartial): string | null => {
  switch (true) {
    case pathname.startsWith('/wallet/accounts/'): {
      return null
    }
    case pathname.startsWith('/assets/'): {
      // example path
      // /assets/eip155:1/slip44:60
      const parts = pathname.split('/')
      const [_, assetLiteral, chainId, assetIdParts, ...additionalAssetIdParts] = parts
      const maybeAssetId = [chainId, assetIdParts, ...additionalAssetIdParts].join('/')
      const mixpanelAssetId = maybeAssetId && getMaybeCompositeAssetSymbol(maybeAssetId, assets)
      const newParts = [_, assetLiteral]
      if (mixpanelAssetId) newParts.push(mixpanelAssetId)
      return newParts.join('/')
    }
    default:
      return pathname
  }
}

export const assetToCompositeSymbol = (asset: Asset): string => {
  const { chainId } = asset
  const networkName = getChainAdapterManager().get(chainId)?.getDisplayName()
  return `${networkName}.${asset?.symbol}`
}

export const getMaybeCompositeAssetSymbol = (
  assetId: AssetId,
  assetsById: AssetsByIdPartial,
): string => {
  const asset = assetsById[assetId]
  if (!asset) return assetId // better than 'unknown asset'
  return assetToCompositeSymbol(asset)
}

export const trackOpportunityEvent = (
  event: MixPanelEvent,
  properties: TrackOpportunityProps,
  assetsById: AssetsByIdPartial,
) => {
  const mixpanel = getMixPanel()
  const { opportunity, cryptoAmounts, fiatAmounts, element } = properties
  const eventData = {
    provider: opportunity.provider,
    type: opportunity.type,
    version: opportunity.version,
    name: opportunity.name,
    asset: getMaybeCompositeAssetSymbol(opportunity.assetId, assetsById),
    underlyingAssets: opportunity.underlyingAssetIds.map(assetId =>
      getMaybeCompositeAssetSymbol(assetId, assetsById),
    ),
    ...(fiatAmounts && {
      fiatAmounts: fiatAmounts.map(fiatAmount => bnOrZero(fiatAmount).toNumber()),
    }),
    ...(cryptoAmounts &&
      Object.fromEntries(
        cryptoAmounts.map(claimAmount => [
          getMaybeCompositeAssetSymbol(claimAmount.assetId, assetsById),
          claimAmount.amountCryptoHuman,
        ]),
      )),
    ...(element && { element }),
  }
  mixpanel?.track(event, eventData)
}
