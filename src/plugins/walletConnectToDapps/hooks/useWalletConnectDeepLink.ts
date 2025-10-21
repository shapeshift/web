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

      if (!encodedUri) {
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
          // We do not handle session_authenticate events, so make it a session_proposal instead
          const pairingUri = uri.replace('sessionAuthenticate', 'sessionProposal')
          await state.pair?.({ uri: pairingUri })

          // Successfully initiated pairing, navigate away
          if (!hasNavigatedRef.current) {
            navigate('/trade', { replace: true })
            hasNavigatedRef.current = true
          }
        } catch (error) {
          // Handle pairing errors
          if ((error as Error)?.message.includes('Pairing already exists')) {
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
            console.error('WalletConnect pairing error:', error)
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
