import { useAppKitAccount } from '@reown/appkit/react'
import { useCallback, useEffect, useState } from 'react'
import { useSignMessage } from 'wagmi'
import { z } from 'zod'

import { parseResponse } from '../lib/api'
import { API_BASE_URL } from '../lib/constants'

const AUTH_SIWE_URL = `${API_BASE_URL}/auth/siwe`

const NonceResponseSchema = z.object({ nonce: z.string() })
const VerifyResponseSchema = z.object({
  token: z.string(),
  address: z.string(),
})

interface SiweAuthState {
  token: string | null
  authenticatedAddress: string | null
  isAuthenticating: boolean
  error: string | null
}

interface UseSiweAuthReturn extends SiweAuthState {
  signIn: () => Promise<void>
  signOut: () => void
  isAuthenticated: boolean
  authHeaders: Record<string, string>
}

export const useSiweAuth = (): UseSiweAuthReturn => {
  const { address, isConnected } = useAppKitAccount()
  const { signMessageAsync } = useSignMessage()

  const [token, setToken] = useState<string | null>(null)
  const [authenticatedAddress, setAuthenticatedAddress] = useState<string | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isConnected || !address) {
      setToken(null)
      setAuthenticatedAddress(null)
      return
    }

    if (authenticatedAddress && authenticatedAddress !== address.toLowerCase()) {
      setToken(null)
      setAuthenticatedAddress(null)
    }
  }, [isConnected, address, authenticatedAddress])

  const signIn = useCallback(async (): Promise<void> => {
    if (!address) return

    setIsAuthenticating(true)
    setError(null)

    try {
      const nonceRes = await fetch(`${AUTH_SIWE_URL}/nonce`, { method: 'POST' })
      const { nonce } = await parseResponse(nonceRes, NonceResponseSchema)

      const domain = window.location.host
      const uri = window.location.origin
      const issuedAt = new Date().toISOString()

      const message = [
        `${domain} wants you to sign in with your Ethereum account:`,
        address,
        '',
        'Sign in to ShapeShift Affiliate Dashboard',
        '',
        `URI: ${uri}`,
        'Version: 1',
        'Chain ID: 42161',
        `Nonce: ${nonce}`,
        `Issued At: ${issuedAt}`,
      ].join('\n')

      const signature = await signMessageAsync({ message })

      const verifyRes = await fetch(`${AUTH_SIWE_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      })
      const { token: jwt, address: verifiedAddress } = await parseResponse(
        verifyRes,
        VerifyResponseSchema,
      )

      setToken(jwt)
      setAuthenticatedAddress(verifiedAddress.toLowerCase())
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed'
      setError(msg)
    } finally {
      setIsAuthenticating(false)
    }
  }, [address, signMessageAsync])

  const signOut = useCallback((): void => {
    setToken(null)
    setAuthenticatedAddress(null)
    setError(null)
  }, [])

  const isAuthenticated =
    token !== null &&
    authenticatedAddress !== null &&
    isConnected &&
    address?.toLowerCase() === authenticatedAddress

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  return {
    token,
    authenticatedAddress,
    isAuthenticating,
    error,
    signIn,
    signOut,
    isAuthenticated,
    authHeaders,
  }
}
