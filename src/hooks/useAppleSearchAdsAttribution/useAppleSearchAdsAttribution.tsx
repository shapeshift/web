import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { getAppleAttributionData } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { isMobile } from '@/lib/globals'
import { trackAppleSearchAdsAttribution } from '@/lib/mixpanel/helpers'

const ASA_TRACKED_KEY = 'shapeshift.asa.tracked'

/**
 * Hook to fetch and track Apple Search Ads attribution data from the mobile app
 *
 * This hook should be called once on app initialization. It:
 * 1. Requests ASA attribution data from the iOS mobile app
 * 2. Tracks the ad_attribution_received event in Mixpanel (ONCE per user, ever)
 * 3. Sets first-touch user properties (ft_source, ft_apple_keyword, ft_apple_keyword_id)
 *
 * The event is tracked only once per user by storing a flag in localStorage.
 * The first-touch properties are set using people.set_once() to ensure they persist
 * after wallet ID aliasing.
 */
export const useAppleSearchAdsAttribution = () => {
  const [hasTracked, setHasTracked] = useState(() => {
    // Check if we've already tracked this user
    try {
      return localStorage.getItem(ASA_TRACKED_KEY) === 'true'
    } catch {
      return false
    }
  })

  const { data: attributionData } = useQuery({
    queryKey: ['apple-search-ads-attribution-data'],
    queryFn: () => getAppleAttributionData(),
    // enabled: isMobile && !hasTracked,
  })

  useEffect(() => {
    if (hasTracked) return
    if (!isMobile) return

    if (attributionData) {
      trackAppleSearchAdsAttribution(attributionData)
      setHasTracked(true)
      localStorage.setItem(ASA_TRACKED_KEY, 'true')
    }
  }, [attributionData, hasTracked, setHasTracked])
}
