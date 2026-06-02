import { useEffect, useState } from 'react'

import { DEFAULT_FEE_BPS } from '@/lib/fees/constant'

const PARTNER_ADDRESS_KEY = 'shapeshift_partner_address'
const PARTNER_BPS_KEY = 'shapeshift_partner_bps'
const PARTNER_CODE_KEY = 'shapeshift_partner_code'
const PARTNER_TIMESTAMP_KEY = 'shapeshift_partner_timestamp'
const PARTNER_TTL_MS = 30 * 24 * 60 * 60 * 1000
const SHAPESHIFT_BPS_KEY = 'shapeshift_bps'
const VERSION_KEY = 'shapeshift_version'

if (typeof window !== 'undefined') {
  try {
    if (!window.localStorage.getItem(VERSION_KEY)) {
      ;[
        PARTNER_ADDRESS_KEY,
        PARTNER_BPS_KEY,
        PARTNER_CODE_KEY,
        PARTNER_TIMESTAMP_KEY,
        SHAPESHIFT_BPS_KEY,
      ].forEach(k => window.localStorage.removeItem(k))
      window.localStorage.setItem(VERSION_KEY, '1')
    }
  } catch {
    // noop
  }
}

const SWAP_SERVICE_BASE_URL = import.meta.env.VITE_SWAPS_SERVER_URL || 'http://localhost:3001'

type PartnerData = {
  partnerAddress: string
  partnerBps: number
  partnerCode: string
  shapeshiftBps: number
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
    window.localStorage.removeItem(SHAPESHIFT_BPS_KEY)
  } catch {
    // noop
  }
}

const storePartnerData = (data: PartnerData): void => {
  try {
    window.localStorage.setItem(PARTNER_ADDRESS_KEY, data.partnerAddress)
    window.localStorage.setItem(PARTNER_BPS_KEY, String(data.partnerBps))
    window.localStorage.setItem(PARTNER_CODE_KEY, data.partnerCode)
    window.localStorage.setItem(PARTNER_TIMESTAMP_KEY, String(Date.now()))
    window.localStorage.setItem(SHAPESHIFT_BPS_KEY, String(data.shapeshiftBps))
  } catch {
    // noop
  }
}

const PARTNER_RESOLVE_TIMEOUT_MS = 5000

const resolvePartnerCode = async (code: string): Promise<PartnerData | null> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PARTNER_RESOLVE_TIMEOUT_MS)

  try {
    const response = await fetch(
      `${SWAP_SERVICE_BASE_URL}/v1/partner/${encodeURIComponent(code)}`,
      { signal: controller.signal },
    )

    if (!response.ok) return null

    return (await response.json()) as PartnerData
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
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

const readStored = (key: string): string | null => {
  if (typeof window === 'undefined') return null

  try {
    const value = window.localStorage.getItem(key)
    const timestamp = window.localStorage.getItem(PARTNER_TIMESTAMP_KEY)

    if (!value) return null

    if (isPartnerExpired(timestamp)) {
      clearPartnerStorage()
      return null
    }

    return value
  } catch {
    return null
  }
}

export const readStoredPartnerAddress = (): string | null => readStored(PARTNER_ADDRESS_KEY)
export const readStoredPartnerBps = (): string | null => readStored(PARTNER_BPS_KEY)
export const readStoredPartnerCode = (): string | null => readStored(PARTNER_CODE_KEY)
export const readStoredShapeshiftBps = (): string | null => readStored(SHAPESHIFT_BPS_KEY)
export const readStoredAffiliateBps = (): string => {
  const partnerBps = readStored(PARTNER_BPS_KEY)
  const shapeshiftBps = readStored(SHAPESHIFT_BPS_KEY)
  if (!partnerBps || !shapeshiftBps) return DEFAULT_FEE_BPS
  return String(Number(partnerBps) + Number(shapeshiftBps))
}

export const useAffiliateTracking = (): string | null => {
  const [storedAddress, setStoredAddress] = useState<string | null>(readStoredPartnerAddress)

  useEffect(() => {
    const code = getPartnerCode()
    if (!code) return

    void resolvePartnerCode(code).then(data => {
      if (!data) return
      storePartnerData(data)
      setStoredAddress(data.partnerAddress)
    })
  }, [])

  return storedAddress
}

export { PARTNER_ADDRESS_KEY as AFFILIATE_STORAGE_KEY }
