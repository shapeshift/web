import { useToast } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { isWalletConnectV2Uri } from '../components/modals/connect/utils'
import type { WalletConnectState } from '../types'

import { useWallet } from '@/hooks/useWallet/useWallet'

export const useWalletConnectDeepLink = (state: WalletConnectState) => {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const {
    state: { wallet },
  } = useWallet()
  const pendingUriRef = useRef<string | null>(null)
  const processingRef = useRef(false)
  const hasNavigatedRef = useRef(false)

  useEffect(() => {
    // Reset the navigated flag when we leave the /wc route
    if (!location.pathname.includes('/wc')) {
      pendingUriRef.current = null
      hasNavigatedRef.current = false
      processingRef.current = false
      return
    }

    // Step 1: Extract and store the URI from the route if we haven't already
    if (!pendingUriRef.current && !processingRef.current) {
      const params = new URLSearchParams(location.search)
      const encodedUri = params.get('uri')
      const requestId = params.get('requestId')
      const sessionTopic = params.get('sessionTopic')

      // No-ops request-specific deep links (deep link ping of sorts) - this actually is a new tab, but would produce issues on mobile app
      // These are used by dApps to direct users to specific pending requests
      // We silently navigate away since those are no-op, and would otherwise produce a blank route under the (working) wc modal
      if (!encodedUri && requestId && sessionTopic) {
        // Navigate to /trade to avoid showing blank screen
        navigate('/trade', { replace: true })
        hasNavigatedRef.current = true
        return
      }

      if (!encodedUri) {
        // Check if this is a spurious "wake-up" deep link (mobile pattern)
        const activeSessions = state.web3wallet?.getActiveSessions()
        const sessionCount = activeSessions ? Object.keys(activeSessions).length : 0

        if (sessionCount > 0) {
          // This is a spurious wake-up call (common mobile pattern)
          // Navigate to /trade to avoid showing blank screen
          navigate('/trade', { replace: true })
          hasNavigatedRef.current = true
          return
        }

        // No active sessions - this is a real error
        toast({
          title: 'Invalid WalletConnect Link',
          description: 'No URI parameter found in the link',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        navigate('/trade', { replace: true })
        hasNavigatedRef.current = true
        return
      }

      const uri = decodeURIComponent(encodedUri)

      // Validate it's a valid WalletConnect v2 URI
      if (!isWalletConnectV2Uri(uri)) {
        toast({
          title: 'Invalid WalletConnect Link',
          description: 'The provided URI is not a valid WalletConnect v2 link',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
        navigate('/trade', { replace: true })
        hasNavigatedRef.current = true
        return
      }

      // Store the valid URI for processing
      pendingUriRef.current = uri
    }

    // Step 2: Process the pending URI once state.pair is available AND wallet is unlocked
    if (
      pendingUriRef.current &&
      state.pair &&
      wallet &&
      !processingRef.current &&
      !hasNavigatedRef.current
    ) {
      // Don't process if a modal is already open
      if (state.activeModal) {
        navigate('/trade', { replace: true })
        hasNavigatedRef.current = true
        pendingUriRef.current = null
        return
      }

      processingRef.current = true

      const handlePairing = async () => {
        const uri = pendingUriRef.current
        if (!uri) return

        try {
          await state.pair?.({ uri })

          // Successfully initiated pairing, navigate away
          if (!hasNavigatedRef.current) {
            navigate('/trade', { replace: true })
            hasNavigatedRef.current = true
          }
        } catch (error) {
          // Handle pairing errors
          const errorMessage = (error as Error)?.message || String(error)

          if (errorMessage.includes('Pairing already exists')) {
            toast({
              title: 'Connection Error',
              description: 'This dApp connection already exists',
              status: 'error',
              duration: 5000,
              isClosable: true,
            })
          } else {
            toast({
              title: 'Connection Failed',
              description: 'Failed to connect to the dApp. Please try again.',
              status: 'error',
              duration: 5000,
              isClosable: true,
            })
          }

          if (!hasNavigatedRef.current) {
            navigate('/trade', { replace: true })
            hasNavigatedRef.current = true
          }
        } finally {
          pendingUriRef.current = null
          processingRef.current = false
        }
      }

      void handlePairing()
    }
  }, [location, navigate, toast, state.activeModal, state.pair, wallet, state])
}
