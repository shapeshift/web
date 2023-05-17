import type { AssetId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { AssetsById } from 'state/slices/assetsSlice/assetsSlice'

import { getMixPanel } from './mixPanelSingleton'
import type { MixPanelEvents, TrackOpportunityProps } from './types'

export const mapMixpanelPathname = (pathname: string, assets: AssetsById): string => {
  switch (true) {
    case pathname.startsWith('/accounts/'): {
      // example path
      // /accounts/eip155:1:0xa4..35/eip155:1%2Ferc20:0x1f9840a85d5af5bf1d1762f925bdaddc4201f984
      const parts = pathname.split('/')
      const [_, accountLiteral, accountId, maybeEscapedAssetId] = parts
      const { chainId } = fromAccountId(accountId)
      const chainName = getChainAdapterManager().get(chainId)?.getDisplayName()
      const assetId = maybeEscapedAssetId && decodeURIComponent(maybeEscapedAssetId)
      const mixpanelAssetId = getMaybeCompositeAssetSymbol(assetId, assets)
      const newParts = [_, accountLiteral, chainName]
      if (mixpanelAssetId) newParts.push(mixpanelAssetId)
      return newParts.join('/')
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

export const getMaybeCompositeAssetSymbol = (assetId: AssetId, assetsById: AssetsById): string => {
  const asset = assetsById[assetId]
  if (!asset) return assetId // better than 'unknown asset'
  return assetToCompositeSymbol(asset)
}

export const trackOpportunityEvent = (
  event: MixPanelEvents,
  properties: TrackOpportunityProps,
  assetsById: AssetsById,
) => {
  const mixpanel = getMixPanel()
  const { opportunity, cryptoAmounts, fiatAmounts, element } = properties
  const eventData = {
    provider: opportunity.provider,
    type: opportunity.type,
    version: opportunity.version,
    assets: opportunity.underlyingAssetIds.map(assetId =>
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
