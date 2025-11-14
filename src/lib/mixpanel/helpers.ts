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
 * @param attribution - The attribution response from the mobile app (can be data or token)
 */
export const trackAppleSearchAdsAttribution = (
  attribution: AppleSearchAdsAttribution | undefined,
) => {
  const mixpanel = getMixPanel()
  if (!mixpanel) return

  // Handle token-only response (web app would need to exchange with Apple API)
  if (attribution?.type === 'token') {
    console.warn(
      'Received Apple Search Ads token but web app cannot exchange it with Apple API due to CORS. ' +
        'Mobile app should exchange the token and send full attribution data instead.',
    )
    // Track minimal event without campaign details
    mixpanel.track('ad_attribution_received', {
      ua_source: 'apple_search_ads',
      apple_keyword: 'unknown_keyword',
      apple_keyword_id: 'unknown',
      token_received: true,
    })
    mixpanel.people.set_once({
      ft_source: 'apple_search_ads',
      ft_apple_keyword: 'unknown_keyword',
      ft_apple_keyword_id: 'unknown',
    })
    return
  }

  // Handle full attribution data response
  const data = attribution?.type === 'data' ? attribution.data : undefined

  // Only track if attribution was found
  if (!data?.attribution) {
    console.log('No Apple Search Ads attribution found for this install')
    return
  }

  // Extract keyword ID (use 'unknown' as fallback per requirements)
  const keywordId = data.keywordId?.toString() || 'unknown'

  // Note: Apple's API doesn't provide the actual keyword text in the response
  // Only the keywordId is available. To get the keyword text, you would need to:
  // 1. Use Apple Search Ads Campaign Management API with your developer credentials
  // 2. Map keywordId to keyword text from your campaign data
  // For now, we use 'unknown_keyword' as the fallback
  const keyword = 'unknown_keyword' // Apple API doesn't return keyword text

  // Track the event with all available campaign data
  mixpanel.track('ad_attribution_received', {
    ua_source: 'apple_search_ads',
    apple_keyword: keyword,
    apple_keyword_id: keywordId,
    campaign_id: data.campaignId,
    ad_group_id: data.adGroupId,
    ad_id: data.adId,
    org_id: data.orgId,
    country: data.countryOrRegion,
    conversion_type: data.conversionType,
    claim_type: data.claimType,
    ...(data.clickDate && { click_date: data.clickDate }),
  })

  // Set first-touch properties using set_once to ensure they persist after aliasing
  mixpanel.people.set_once({
    ft_source: 'apple_search_ads',
    ft_apple_keyword: keyword,
    ft_apple_keyword_id: keywordId,
    ft_campaign_id: data.campaignId,
    ft_ad_group_id: data.adGroupId,
    ft_ad_id: data.adId,
    ft_country: data.countryOrRegion,
    ft_conversion_type: data.conversionType,
  })
}
