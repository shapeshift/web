import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsByIdPartial } from '@shapeshiftoss/types'

import { getMixPanel } from './mixPanelSingleton'
import type { MixPanelEvent, TrackOpportunityProps } from './types'

import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import type { AppleSearchAdsAttribution } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { bnOrZero } from '@/lib/bignumber/bignumber'

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

/**
 * Track Apple Search Ads attribution data
 *
 * This function should be called once when ASA attribution data is received from the mobile app.
 * It tracks the event and sets first-touch user properties using people.set_once to ensure
 * the properties persist after wallet ID aliasing.
 *
 * @param attribution - The attribution data from Apple Search Ads
 */
export const trackAppleSearchAdsAttribution = (
  attribution: AppleSearchAdsAttribution | undefined,
) => {
  const mixpanel = getMixPanel()
  if (!mixpanel) return

  // Apply fallback values per requirements
  const appleKeyword = attribution?.appleKeyword || 'unknown_keyword'
  const appleKeywordId = attribution?.appleKeywordId || 'unknown'

  // Track the event
  mixpanel.track('ad_attribution_received', {
    ua_source: 'apple_search_ads',
    apple_keyword: appleKeyword,
    apple_keyword_id: appleKeywordId,
    ...(attribution?.campaignId && { campaign_id: attribution.campaignId }),
    ...(attribution?.adGroupId && { ad_group_id: attribution.adGroupId }),
    ...(attribution?.creativeSetId && { creative_set_id: attribution.creativeSetId }),
  })

  // Set first-touch properties using set_once to ensure they persist after aliasing
  mixpanel.people.set_once({
    ft_source: 'apple_search_ads',
    ft_apple_keyword: appleKeyword,
    ft_apple_keyword_id: appleKeywordId,
    ...(attribution?.campaignId && { ft_campaign_id: attribution.campaignId }),
    ...(attribution?.adGroupId && { ft_ad_group_id: attribution.adGroupId }),
    ...(attribution?.creativeSetId && { ft_creative_set_id: attribution.creativeSetId }),
  })
}
