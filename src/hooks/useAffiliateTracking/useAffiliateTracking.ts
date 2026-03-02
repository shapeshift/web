import { useEffect, useState } from 'react'
import { isAddress } from 'viem'

const AFFILIATE_STORAGE_KEY = 'shapeshift_affiliate_address'
const AFFILIATE_TIMESTAMP_KEY = 'shapeshift_affiliate_timestamp'
const AFFILIATE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

const isAffiliateExpired = (timestamp: string | null): boolean => {
  if (!timestamp) return true
  const storedTime = Number(timestamp)
  if (Number.isNaN(storedTime)) return true
  return Date.now() - storedTime > AFFILIATE_TTL_MS
}

const clearAffiliateStorage = (): void => {
  try {
    window.localStorage.removeItem(AFFILIATE_STORAGE_KEY)
    window.localStorage.removeItem(AFFILIATE_TIMESTAMP_KEY)
  } catch (error) {
    console.warn('Error clearing affiliate data from localStorage:', error)
  }
}

export const readStoredAffiliate = (): string | null => {
  if (typeof window === 'undefined') return null

  try {
    const address = window.localStorage.getItem(AFFILIATE_STORAGE_KEY)
    const timestamp = window.localStorage.getItem(AFFILIATE_TIMESTAMP_KEY)

    if (!address) return null

    if (isAffiliateExpired(timestamp)) {
      clearAffiliateStorage()
      return null
    }

    return address
  } catch (error) {
    console.warn('Error reading affiliate address from localStorage:', error)
    return null
  }
}

export const useAffiliateTracking = (): string | null => {
  const [storedAffiliateAddress, setStoredAffiliateAddress] = useState<string | null>(
    readStoredAffiliate,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    const hash = window.location.hash
    const hashQueryIdx = hash.indexOf('?')
    const searchStr = hashQueryIdx !== -1 ? hash.substring(hashQueryIdx) : window.location.search
    const params = new URLSearchParams(searchStr)
    const affiliateParam = params.get('affiliate')

    if (!affiliateParam) return

    const isValidEvmAddress = isAddress(affiliateParam)
    if (!isValidEvmAddress) return

    // If we already have a non-expired affiliate stored, only override if it's different AND expired
    if (storedAffiliateAddress) {
      if (affiliateParam === storedAffiliateAddress) return

      const timestamp = window.localStorage.getItem(AFFILIATE_TIMESTAMP_KEY)
      if (!isAffiliateExpired(timestamp)) return
    }

    try {
      window.localStorage.setItem(AFFILIATE_STORAGE_KEY, affiliateParam)
      window.localStorage.setItem(AFFILIATE_TIMESTAMP_KEY, String(Date.now()))
      setStoredAffiliateAddress(affiliateParam)
    } catch (error) {
      console.warn('Error storing affiliate address to localStorage:', error)
    }
  }, [storedAffiliateAddress])

  return storedAffiliateAddress
}

export { AFFILIATE_STORAGE_KEY }
