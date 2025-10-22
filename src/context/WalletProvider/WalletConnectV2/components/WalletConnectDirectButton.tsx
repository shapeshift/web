import { Box, Button, Spinner } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { isMobile } from 'react-device-detect'

import { useDirectWalletConnect } from '../useDirectConnect'

import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'

/**
 * UGLY POC: Direct WalletConnect connection button
 * This is an intentionally ugly proof of concept
 */
export const WalletConnectDirectButton = () => {
  console.log('🚨 UGLY: WalletConnectDirectButton is rendering!')
  const { connectToWallet, error } = useDirectWalletConnect()
  const { state, dispatch } = useWallet()
  const [loadingWallet, setLoadingWallet] = useState<'metamask' | 'trust' | 'zerion' | null>(null)
  const [mobilePending, setMobilePending] = useState(false)

  // UGLY: Check if we're connected after returning from wallet on mobile
  useEffect(() => {
    if (isMobile && mobilePending && loadingWallet) {
      console.log('🚨 UGLY: Checking for connection on mobile...')
      const checkInterval = setInterval(() => {
        const provider = (window as any).uglyProvider
        console.log('🚨 UGLY: Checking provider connected state:', provider?.connected)
        console.log('🚨 UGLY: Checking wallet state:', state.isConnected)

        if (provider?.connected || state.isConnected) {
          console.log('🚨 UGLY: Connection detected!')
          clearInterval(checkInterval)
          setMobilePending(false)
          setLoadingWallet(null) // Clear loading state after successful connection
          // UGLY: Close modal when connection is detected
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        }
      }, 1000)

      // Stop checking after 60 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkInterval)
        setMobilePending(false)
        setLoadingWallet(null) // Clear loading state on timeout
      }, 60000)

      return () => {
        clearInterval(checkInterval)
        clearTimeout(timeout)
      }
    }
  }, [mobilePending, state.isConnected, loadingWallet, dispatch])

  // UGLY: Show error if one occurs
  useEffect(() => {
    if (error) {
      console.error('🚨 UGLY ERROR:', error)
      setLoadingWallet(null)
      setMobilePending(false)
    }
  }, [error])

  const handleDirectConnect = useCallback(
    async (walletId: 'metamask' | 'trust' | 'zerion') => {
      console.log(`🚨 UGLY: Button clicked for ${walletId}!`)
      setLoadingWallet(walletId)

      try {
        await connectToWallet(walletId)

        // On mobile, connection happens async
        if (isMobile) {
          console.log('🚨 UGLY: Mobile mode - setting pending state')
          setMobilePending(true)
        } else {
          // Desktop shows QR code via alert, just wait for connection
          console.log('🚨 UGLY: Desktop mode - waiting for QR scan')
        }
      } catch (error) {
        console.error('🚨 UGLY: Direct connection failed:', error)
        setLoadingWallet(null)
        setMobilePending(false)
      }
    },
    [connectToWallet],
  )

  // UGLY: Memoize props to satisfy React linting
  const spinnerElement = useMemo(() => <Spinner color='white' />, [])

  // MetaMask button styles
  const hoverStyles = useMemo(
    () => ({
      bg: mobilePending ? 'orange.700' : 'red.700',
      transform: 'scale(1.02)',
      border: '3px solid yellow',
    }),
    [mobilePending],
  )

  const activeStyles = useMemo(
    () => ({
      bg: mobilePending ? 'orange.800' : 'red.800',
      transform: 'scale(0.98)',
    }),
    [mobilePending],
  )

  // Trust wallet button styles
  const trustHoverStyles = useMemo(
    () => ({
      bg: mobilePending ? 'purple.700' : 'blue.700',
      transform: 'scale(1.02)',
      border: '3px solid lime',
    }),
    [mobilePending],
  )

  const trustActiveStyles = useMemo(
    () => ({
      bg: mobilePending ? 'purple.800' : 'blue.800',
      transform: 'scale(0.98)',
    }),
    [mobilePending],
  )

  // Zerion button styles
  const zerionHoverStyles = useMemo(
    () => ({
      bg: mobilePending && loadingWallet === 'zerion' ? 'green.700' : 'purple.700',
      transform: 'scale(1.02)',
      border: '3px solid orange',
    }),
    [mobilePending, loadingWallet],
  )

  const zerionActiveStyles = useMemo(
    () => ({
      bg: mobilePending && loadingWallet === 'zerion' ? 'green.800' : 'purple.800',
      transform: 'scale(0.98)',
    }),
    [mobilePending, loadingWallet],
  )

  const disabledStyles = useMemo(
    () => ({
      opacity: 0.6,
      cursor: 'not-allowed',
    }),
    [],
  )

  // UGLY: Callbacks for button clicks
  const handleMetaMaskClick = useCallback(
    () => handleDirectConnect('metamask'),
    [handleDirectConnect],
  )
  const handleTrustClick = useCallback(() => handleDirectConnect('trust'), [handleDirectConnect])
  const handleZerionClick = useCallback(() => handleDirectConnect('zerion'), [handleDirectConnect])

  return (
    <Box mt={4}>
      {/* UGLY MetaMask Button */}
      <Box position='relative' mb={3}>
        <Button
          onClick={handleMetaMaskClick}
          isLoading={loadingWallet === 'metamask'}
          loadingText={
            mobilePending && loadingWallet === 'metamask'
              ? 'Check MetaMask App!'
              : isMobile
              ? 'Opening MetaMask...'
              : 'Show QR for MetaMask...'
          }
          spinner={spinnerElement}
          size='lg'
          width='100%'
          height='60px'
          bg={mobilePending ? 'orange.600' : 'red.600'}
          color='white'
          border='3px dashed yellow'
          borderRadius='md'
          _hover={hoverStyles}
          _active={activeStyles}
          fontWeight='bold'
          fontSize='lg'
          textTransform='uppercase'
          boxShadow='0 4px 6px rgba(255, 0, 0, 0.3)'
          _disabled={disabledStyles}
        >
          {mobilePending && loadingWallet === 'metamask' ? 'WAITING FOR APPROVAL' : 'METAMASK'}
        </Button>

        <Box
          position='absolute'
          top='-8px'
          right='-8px'
          bg='yellow.400'
          color='red.900'
          px={2}
          py={1}
          borderRadius='md'
          fontSize='xs'
          fontWeight='bold'
          transform='rotate(12deg)'
          boxShadow='0 2px 4px rgba(0,0,0,0.2)'
          zIndex={1}
        >
          UGLY!
        </Box>
      </Box>

      {/* UGLY Trust Wallet Button */}
      <Box position='relative'>
        <Button
          onClick={handleTrustClick}
          isLoading={loadingWallet === 'trust'}
          loadingText={
            mobilePending && loadingWallet === 'trust'
              ? 'Check Trust Wallet!'
              : isMobile
              ? 'Opening Trust...'
              : 'Show QR for Trust...'
          }
          spinner={spinnerElement}
          size='lg'
          width='100%'
          height='60px'
          bg={mobilePending ? 'purple.600' : 'blue.600'}
          color='white'
          border='3px dashed lime'
          borderRadius='md'
          _hover={trustHoverStyles}
          _active={trustActiveStyles}
          fontWeight='bold'
          fontSize='lg'
          textTransform='uppercase'
          boxShadow='0 4px 6px rgba(0, 0, 255, 0.3)'
          _disabled={disabledStyles}
        >
          {mobilePending && loadingWallet === 'trust' ? 'WAITING FOR TRUST!' : 'TRUST'}
        </Button>

        <Box
          position='absolute'
          top='-8px'
          right='-8px'
          bg='lime.400'
          color='blue.900'
          px={2}
          py={1}
          borderRadius='md'
          fontSize='xs'
          fontWeight='bold'
          transform='rotate(12deg)'
          boxShadow='0 2px 4px rgba(0,0,0,0.2)'
          zIndex={1}
        >
          SUPER UGLY!
        </Box>
      </Box>

      {/* UGLY Zerion Button */}
      <Box position='relative' mt={3}>
        <Button
          onClick={handleZerionClick}
          isLoading={loadingWallet === 'zerion'}
          loadingText={
            mobilePending && loadingWallet === 'zerion'
              ? 'Check Zerion!'
              : isMobile
              ? 'Opening Zerion...'
              : 'Show QR for Zerion...'
          }
          spinner={spinnerElement}
          size='lg'
          width='100%'
          height='60px'
          bg={mobilePending && loadingWallet === 'zerion' ? 'green.600' : 'purple.600'}
          color='white'
          border='3px dashed orange'
          borderRadius='md'
          _hover={zerionHoverStyles}
          _active={zerionActiveStyles}
          fontWeight='bold'
          fontSize='lg'
          textTransform='uppercase'
          boxShadow='0 4px 6px rgba(128, 0, 128, 0.3)'
          _disabled={disabledStyles}
        >
          {mobilePending && loadingWallet === 'zerion' ? 'WAITING FOR ZERION!' : 'ZERION'}
        </Button>

        <Box
          position='absolute'
          top='-8px'
          right='-8px'
          bg='orange.400'
          color='purple.900'
          px={2}
          py={1}
          borderRadius='md'
          fontSize='xs'
          fontWeight='bold'
          transform='rotate(15deg)'
          boxShadow='0 2px 4px rgba(0,0,0,0.2)'
          zIndex={1}
        >
          FUARKIN UGLY!
        </Box>
      </Box>
    </Box>
  )
}
