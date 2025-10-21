import { Button, Box, Spinner, useToast } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { isMobile } from 'react-device-detect'

import { useDirectWalletConnect } from '../useDirectConnect'

/**
 * UGLY POC: Direct WalletConnect connection button
 * This is an intentionally ugly proof of concept
 */
export const WalletConnectDirectButton = () => {
  const { connectToWallet, isConnecting } = useDirectWalletConnect()
  const [isLoading, setIsLoading] = useState(false)
  const toast = useToast()

  const handleDirectConnect = useCallback(async () => {
    setIsLoading(true)
    try {
      await connectToWallet('metamask')
      toast({
        title: '🚨 UGLY SUCCESS! 🚨',
        description: 'Ugly POC connected to MetaMask via WalletConnect!',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Direct connection failed:', error)
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect directly',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }, [connectToWallet, toast])

  return (
    <Box mt={4} position="relative">
      <Button
        onClick={handleDirectConnect}
        isLoading={isLoading || isConnecting}
        loadingText={isMobile ? 'Opening MetaMask...' : 'Show QR for MetaMask...'}
        spinner={<Spinner color="white" />}
        size="lg"
        width="100%"
        height="60px"
        bg="red.600"
        color="white"
        border="3px dashed yellow"
        borderRadius="md"
        _hover={{
          bg: 'red.700',
          transform: 'scale(1.02)',
          border: '3px solid yellow',
        }}
        _active={{
          bg: 'red.800',
          transform: 'scale(0.98)',
        }}
        fontWeight="bold"
        fontSize="lg"
        textTransform="uppercase"
        boxShadow="0 4px 6px rgba(255, 0, 0, 0.3)"
        _disabled={{
          opacity: 0.6,
          cursor: 'not-allowed',
        }}
      >
        🚨 UGLY POC: Connect WC MM 🚨
      </Button>

      <Box
        position="absolute"
        top="-10px"
        right="-10px"
        bg="yellow.400"
        color="red.900"
        px={2}
        py={1}
        borderRadius="md"
        fontSize="xs"
        fontWeight="bold"
        transform="rotate(12deg)"
        boxShadow="0 2px 4px rgba(0,0,0,0.2)"
      >
        TEST ONLY!
      </Box>
    </Box>
  )
}