import { useAppKitAccount } from '@reown/appkit/react'
import { useCallback, useEffect, useState } from 'react'
import { useSignMessage } from 'wagmi'

const API_BASE = '/v1/auth/siwe'

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
      const nonceRes = await fetch(`${API_BASE}/nonce`, { method: 'POST' })
      if (!nonceRes.ok) throw new Error('Failed to get nonce')
      const { nonce } = (await nonceRes.json()) as { nonce: string }

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

      const verifyRes = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      })

      if (!verifyRes.ok) {
        const body = (await verifyRes.json()) as { message?: string }
        throw new Error(body.message ?? 'Verification failed')
      }

      const { token: jwt, address: verifiedAddress } = (await verifyRes.json()) as {
        token: string
        address: string
      }

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
