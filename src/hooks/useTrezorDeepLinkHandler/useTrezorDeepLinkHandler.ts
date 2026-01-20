import { useEffect } from 'react'

const STORAGE_KEY_REQUEST = 'trezor_deeplink_request'
const STORAGE_KEY_RESPONSE = 'trezor_deeplink_response'

type TrezorDeepLinkRequest = {
  id: string
  method: string
  params: Record<string, unknown>
  timestamp: number
  returnUrl: string
}

type TrezorDeepLinkResponse = {
  id: string
  response: unknown
}

const getPendingRequest = (): TrezorDeepLinkRequest | null => {
  const data = localStorage.getItem(STORAGE_KEY_REQUEST)
  return data ? JSON.parse(data) : null
}

const clearPendingRequest = (): void => {
  localStorage.removeItem(STORAGE_KEY_REQUEST)
}

const storeResponse = (response: TrezorDeepLinkResponse): void => {
  localStorage.setItem(STORAGE_KEY_RESPONSE, JSON.stringify(response))
}

/**
 * Hook to handle Trezor deep link callbacks at app startup.
 *
 * Trezor Suite puts the response in window.location.search (before the hash),
 * not in the hash route's query params. This hook detects that and stores
 * the response for the test page to pick up.
 */
export const useTrezorDeepLinkHandler = () => {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const responseParam = searchParams.get('response')

    if (!responseParam) return

    console.log('[TrezorDeepLinkHandler] Found response in URL search params')

    const pendingRequest = getPendingRequest()

    if (!pendingRequest) {
      console.warn('[TrezorDeepLinkHandler] No pending request found, ignoring response')
      return
    }

    try {
      const parsedResponse = JSON.parse(decodeURIComponent(responseParam))
      console.log('[TrezorDeepLinkHandler] Parsed response:', parsedResponse)

      storeResponse({
        id: pendingRequest.id,
        response: parsedResponse,
      })

      clearPendingRequest()

      // Clean up the URL by removing the response param, preserving the hash route
      const cleanUrl = window.location.origin + window.location.pathname + window.location.hash
      window.history.replaceState({}, '', cleanUrl)

      console.log(
        '[TrezorDeepLinkHandler] Response stored, URL cleaned. Visit /trezor-test to see the response.',
      )
    } catch (e) {
      console.error('[TrezorDeepLinkHandler] Failed to parse response:', e)
    }
  }, [])
}
