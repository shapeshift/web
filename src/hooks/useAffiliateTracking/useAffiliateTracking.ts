import { useEffect, useState } from 'react'

const PARTNER_ADDRESS_KEY = 'shapeshift_partner_address'
const PARTNER_BPS_KEY = 'shapeshift_partner_bps'
const PARTNER_CODE_KEY = 'shapeshift_partner_code'
const PARTNER_TIMESTAMP_KEY = 'shapeshift_partner_timestamp'
const PARTNER_TTL_MS = 30 * 24 * 60 * 60 * 1000
const SHAPESHIFT_CUT_BPS = 10

const PARTNER_LOOKUP_URL = import.meta.env.VITE_SWAPS_SERVER_URL || 'http://localhost:3001'

type PartnerData = {
  affiliateAddress: string
  bps: number
  partnerCode: string
}

const isPartnerExpired = (timestamp: string | null): boolean => {
  if (!timestamp) return true
  const storedTime = Number(timestamp)
  if (Number.isNaN(storedTime)) return true
  return Date.now() - storedTime > PARTNER_TTL_MS
}

const clearPartnerStorage = (): void => {
  try {
    window.localStorage.removeItem(PARTNER_ADDRESS_KEY)
    window.localStorage.removeItem(PARTNER_BPS_KEY)
    window.localStorage.removeItem(PARTNER_CODE_KEY)
    window.localStorage.removeItem(PARTNER_TIMESTAMP_KEY)
  } catch {
    // noop
  }
}

const storePartnerData = (data: PartnerData): void => {
  try {
    const totalBps = String(data.bps + SHAPESHIFT_CUT_BPS)
    window.localStorage.setItem(PARTNER_ADDRESS_KEY, data.affiliateAddress)
    window.localStorage.setItem(PARTNER_BPS_KEY, totalBps)
    window.localStorage.setItem(PARTNER_CODE_KEY, data.partnerCode)
    window.localStorage.setItem(PARTNER_TIMESTAMP_KEY, String(Date.now()))
  } catch {
    // noop
  }
}

export const readStoredAffiliate = (): string | null => {
  if (typeof window === 'undefined') return null

  try {
    const address = window.localStorage.getItem(PARTNER_ADDRESS_KEY)
    const timestamp = window.localStorage.getItem(PARTNER_TIMESTAMP_KEY)

    if (!address) return null

    if (isPartnerExpired(timestamp)) {
      clearPartnerStorage()
      return null
    }

    return address
  } catch {
    return null
  }
}

export const readStoredPartnerBps = (): string | null => {
  if (typeof window === 'undefined') return null

  try {
    const bps = window.localStorage.getItem(PARTNER_BPS_KEY)
    const timestamp = window.localStorage.getItem(PARTNER_TIMESTAMP_KEY)

    if (!bps) return null

    if (isPartnerExpired(timestamp)) {
      clearPartnerStorage()
      return null
    }

    return bps
  } catch {
    return null
  }
}

const resolvePartnerCode = async (code: string): Promise<PartnerData | null> => {
  try {
    const response = await fetch(`${PARTNER_LOOKUP_URL}/v1/partner/${encodeURIComponent(code)}`)
    if (!response.ok) return null

    const data = (await response.json()) as {
      affiliateAddress: string
      bps: number
      partnerCode: string
    }

    return data
  } catch {
    return null
  }
}

const getPartnerCode = (): string | null => {
  if (typeof window === 'undefined') return null

  const hash = window.location.hash
  const hashQueryIdx = hash.indexOf('?')
  const searchStr = hashQueryIdx !== -1 ? hash.substring(hashQueryIdx) : window.location.search
  const params = new URLSearchParams(searchStr)
  const partnerParam = params.get('partner')

  if (partnerParam) return partnerParam

  try {
    const storedCode = window.localStorage.getItem(PARTNER_CODE_KEY)
    const timestamp = window.localStorage.getItem(PARTNER_TIMESTAMP_KEY)
    if (storedCode && !isPartnerExpired(timestamp)) return storedCode
  } catch {
    // noop
  }

  return null
}

export const useAffiliateTracking = (): string | null => {
  const [storedAddress, setStoredAddress] = useState<string | null>(readStoredAffiliate)

  useEffect(() => {
    const code = getPartnerCode()
    if (!code) return

    void resolvePartnerCode(code).then(data => {
      if (!data) return
      storePartnerData(data)
      setStoredAddress(data.affiliateAddress)
    })
  }, [])

  return storedAddress
}

export const readStoredPartnerCode = (): string | null => {
  if (typeof window === 'undefined') return null

  try {
    const code = window.localStorage.getItem(PARTNER_CODE_KEY)
    const timestamp = window.localStorage.getItem(PARTNER_TIMESTAMP_KEY)

    if (!code) return null

    if (isPartnerExpired(timestamp)) {
      clearPartnerStorage()
      return null
    }

    return code
  } catch {
    return null
  }
}

export { PARTNER_ADDRESS_KEY as AFFILIATE_STORAGE_KEY }
