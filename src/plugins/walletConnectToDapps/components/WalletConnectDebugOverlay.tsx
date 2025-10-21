import { Box, Text, VStack } from '@chakra-ui/react'
import { useLocation } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useWalletConnectV2 } from '../WalletConnectV2Provider'

/**
 * Debug div for testing WalletConnect deep links on mobile
 * Always visible for debugging purposes
 */
export const WalletConnectDebugOverlay = () => {
  const location = useLocation()
  const {
    state: { wallet },
  } = useWallet()
  const { pair } = useWalletConnectV2()

  const isOnWcRoute = location.pathname.includes('/wc')
  const params = new URLSearchParams(location.search)
  const hasUriParam = params.has('uri')
  const uriValue = params.get('uri')

  return (
    <Box
      width='full'
      bg={isOnWcRoute ? 'yellow.900' : 'gray.800'}
      color='white'
      p={2}
      fontSize='xs'
      borderTop='2px solid'
      borderBottom='2px solid'
      borderColor={isOnWcRoute ? 'yellow.400' : 'gray.600'}
    >
      <VStack align='start' spacing={0.5}>
        <Text fontWeight='bold'>🐛 DEBUG - WalletConnect Deep Link</Text>
        <Text>
          Route: {location.pathname} | /wc: {isOnWcRoute ? '✅' : '❌'}
        </Text>
        <Text>
          URI Param: {hasUriParam ? '✅' : '❌'}
          {hasUriParam && ` | ${uriValue?.substring(0, 40)}...`}
        </Text>
        <Text>
          Wallet: {wallet ? '✅ Unlocked' : '❌ Locked'} | WC Pair:{' '}
          {pair ? '✅ Ready' : '❌ Not Ready'}
        </Text>
        {isOnWcRoute && (
          <Text fontSize='10px' color='yellow.200' fontWeight='bold'>
            {wallet && pair ? '→ Should trigger pairing!' : '→ Waiting...'}
          </Text>
        )}
      </VStack>
    </Box>
  )
}
