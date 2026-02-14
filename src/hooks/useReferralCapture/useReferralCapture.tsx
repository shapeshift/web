import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const REFERRAL_CODE_KEY = 'shapeshift.referralCode'

/**
 * Captures referral code from URL and stores it in localStorage
 * This hook should be called early in the app lifecycle
 */
export const useReferralCapture = () => {
  const location = useLocation()

  useEffect(() => {
    // Parse the URL search params
    const searchParams = new URLSearchParams(location.search)
    const refCode = searchParams.get('ref')

    if (refCode) {
      try {
        localStorage.setItem(REFERRAL_CODE_KEY, refCode)
      } catch (error) {
        console.error('Failed to save referral code to localStorage:', error)
      }
    }
  }, [location.search])
}

/**
 * Gets the stored referral code from localStorage
 */
export const getStoredReferralCode = (): string | null => {
  try {
    return localStorage.getItem(REFERRAL_CODE_KEY)
  } catch (error) {
    console.error('Failed to get referral code from localStorage:', error)
    return null
  }
}

/**
 * Clears the stored referral code (useful after successful registration)
 */
export const clearStoredReferralCode = (): void => {
  try {
    localStorage.removeItem(REFERRAL_CODE_KEY)
  } catch (error) {
    console.error('Failed to clear referral code from localStorage:', error)
  }
}
