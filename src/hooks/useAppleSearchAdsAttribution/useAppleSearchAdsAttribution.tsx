import { useEffect, useState } from 'react'

import { getAppleAttributionToken } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { exchangeAppleSearchAdsToken } from '@/lib/appleSearchAds/exchangeToken'
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

  useEffect(() => {
    // Only run in mobile app environment
    if (!isMobile) return

    // Only track once per user, ever
    // if (hasTracked) return

    const trackAttribution = async () => {
      try {
        // Request attribution data from the mobile app
        const attribution = await getAppleAttributionToken()

        alert(
          JSON.stringify({
            attribution,
          }),
        )
        // If we received a token, try to exchange it with Apple's API directly
        if (attribution?.type === 'token') {
          console.log('Attempting to exchange Apple Search Ads token from browser...')
          const data = await exchangeAppleSearchAdsToken(attribution.token)

          if (data) {
            // Success! We can call Apple's API from the browser
            console.log('Successfully exchanged token with Apple API from browser')
            trackAppleSearchAdsAttribution({ type: 'data', data })
          } else {
            // CORS blocked or API error - track with token fallback
            console.warn(
              'Failed to exchange token from browser. Mobile app should exchange token instead.',
            )
            trackAppleSearchAdsAttribution(attribution)
          }
        } else {
          // We received full data from mobile app (preferred)
          trackAppleSearchAdsAttribution(attribution)
        }

        // Mark as tracked in localStorage so we never track again
        try {
          localStorage.setItem(ASA_TRACKED_KEY, 'true')
        } catch (error) {
          console.error('Failed to set ASA tracked flag:', error)
        }

        setHasTracked(true)
      } catch (error) {
        alert(
          JSON.stringify({
            error,
          }),
        )
        console.error('Failed to fetch Apple Search Ads attribution:', error)
      }
    }

    trackAttribution()
  }, [hasTracked])
}
