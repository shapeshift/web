import { Box, Button, Spinner, useToast } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { isMobile } from 'react-device-detect'

import { useDirectWalletConnect } from '../useDirectConnect'

import { useWallet } from '@/hooks/useWallet/useWallet'

/**
 * UGLY POC: Direct WalletConnect connection button
 * This is an intentionally ugly proof of concept
 */
export const WalletConnectDirectButton = () => {
  console.log('🚨 UGLY: WalletConnectDirectButton is rendering!')
  const { connectToWallet, isConnecting, error } = useDirectWalletConnect()
  const { state } = useWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [mobilePending, setMobilePending] = useState(false)
  const toast = useToast()

  // UGLY: Check if we're connected after returning from MetaMask
  useEffect(() => {
    if (isMobile && mobilePending) {
      console.log('🚨 UGLY: Checking for connection on mobile...')
      const checkInterval = setInterval(() => {
        const provider = (window as any).uglyProvider
        console.log('🚨 UGLY: Checking provider connected state:', provider?.connected)
        console.log('🚨 UGLY: Checking wallet state:', state.isConnected)

        if (provider?.connected || state.isConnected) {
          console.log('🚨 UGLY: Connection detected!')
          clearInterval(checkInterval)
          setMobilePending(false)
          setIsLoading(false)
          toast({
            title: '🚨 UGLY SUCCESS! 🚨',
            description: 'Connected via WalletConnect!',
            status: 'success',
            duration: 5000,
            isClosable: true,
          })
        }
      }, 1000)

      // Stop checking after 60 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkInterval)
        setMobilePending(false)
        setIsLoading(false)
        toast({
          title: '🚨 UGLY: Timeout 🚨',
          description: 'Connection attempt timed out. Please try again.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        })
      }, 60000)

      return () => {
        clearInterval(checkInterval)
        clearTimeout(timeout)
      }
    }
  }, [mobilePending, state.isConnected, toast])

  // UGLY: Show error if one occurs
  useEffect(() => {
    if (error) {
      console.error('🚨 UGLY ERROR:', error)
      toast({
        title: '🚨 UGLY ERROR 🚨',
        description: error,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      setIsLoading(false)
      setMobilePending(false)
    }
  }, [error, toast])

  const handleDirectConnect = useCallback(async () => {
    console.log('🚨 UGLY: Button clicked!')
    setIsLoading(true)

    try {
      await connectToWallet('metamask')

      // On mobile, connection happens async
      if (isMobile) {
        console.log('🚨 UGLY: Mobile mode - setting pending state')
        setMobilePending(true)
        toast({
          title: '🚨 UGLY: Check MetaMask! 🚨',
          description: 'Approve the connection in MetaMask, then return here',
          status: 'info',
          duration: null, // Keep it open
          isClosable: true,
        })
      } else {
        // Desktop shows QR code via alert, just wait for connection
        console.log('🚨 UGLY: Desktop mode - waiting for QR scan')
      }
    } catch (error) {
      console.error('🚨 UGLY: Direct connection failed:', error)
      toast({
        title: '🚨 UGLY: Connection Failed 🚨',
        description: error instanceof Error ? error.message : 'Failed to connect directly',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
      setIsLoading(false)
      setMobilePending(false)
    }
  }, [connectToWallet, toast])

  // UGLY: Memoize props to satisfy React linting
  const spinnerElement = useMemo(() => <Spinner color='white' />, [])

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

  const disabledStyles = useMemo(
    () => ({
      opacity: 0.6,
      cursor: 'not-allowed',
    }),
    [],
  )

  return (
    <Box mt={4} position='relative'>
      <Button
        onClick={handleDirectConnect}
        isLoading={isLoading || isConnecting || mobilePending}
        loadingText={
          mobilePending
            ? '🚨 Check MetaMask App! 🚨'
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
        {mobilePending ? '🚨 WAITING FOR APPROVAL 🚨' : '🚨 UGLY POC: Connect WC MM 🚨'}
      </Button>

      <Box
        position='absolute'
        top='-10px'
        right='-10px'
        bg='yellow.400'
        color='red.900'
        px={2}
        py={1}
        borderRadius='md'
        fontSize='xs'
        fontWeight='bold'
        transform='rotate(12deg)'
        boxShadow='0 2px 4px rgba(0,0,0,0.2)'
      >
        TEST ONLY!
      </Box>
    </Box>
  )
}
