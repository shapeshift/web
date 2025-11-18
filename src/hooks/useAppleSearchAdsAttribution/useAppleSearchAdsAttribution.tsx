import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { getAppleAttributionData } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { isMobile } from '@/lib/globals'
import { trackAppleSearchAdsAttribution } from '@/lib/mixpanel/helpers'

const ASA_TRACKED_KEY = 'shapeshift.asa.tracked'

export const useAppleSearchAdsAttribution = () => {
  const [hasTracked, setHasTracked] = useState(() => {
    try {
      return localStorage.getItem(ASA_TRACKED_KEY) === 'true'
    } catch {
      return false
    }
  })

  const { data: attributionData } = useQuery({
    queryKey: ['apple-search-ads-attribution-data'],
    queryFn: () => getAppleAttributionData(),
    enabled: isMobile && !hasTracked,
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
