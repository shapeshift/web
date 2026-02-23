import { useEffect, useState } from 'react'
import { isAddress } from 'viem'

const AFFILIATE_STORAGE_KEY = 'shapeshift_affiliate_address'

export const useAffiliateTracking = (): string | null => {
  const [storedAffiliateAddress, setStoredAffiliateAddress] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null

    try {
      return window.localStorage.getItem(AFFILIATE_STORAGE_KEY)
    } catch (error) {
      console.warn('Error reading affiliate address from localStorage:', error)
      return null
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const affiliateParam = params.get('affiliate')

    if (!affiliateParam || storedAffiliateAddress) return

    const isValidEvmAddress = isAddress(affiliateParam)

    if (isValidEvmAddress) {
      try {
        window.localStorage.setItem(AFFILIATE_STORAGE_KEY, affiliateParam)
        setStoredAffiliateAddress(affiliateParam)
      } catch (error) {
        console.warn('Error storing affiliate address to localStorage:', error)
      }
    }
  }, [storedAffiliateAddress])

  return storedAffiliateAddress
}

export { AFFILIATE_STORAGE_KEY }
