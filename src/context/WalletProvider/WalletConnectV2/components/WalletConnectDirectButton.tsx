import { Button, Circle, Flex, Image, Spinner, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { isMobile } from 'react-device-detect'

import { useDirectWalletConnect } from '../useDirectConnect'

import { MetaMaskIcon } from '@/components/Icons/MetaMaskIcon'
import { WalletConnectCurrentColorIcon } from '@/components/Icons/WalletConnectIcon'
import { getConfig } from '@/config'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'

const POLLING_INTERVAL_MS = 1000
const CONNECTION_TIMEOUT_MS = 60000

const { VITE_WALLET_CONNECT_WALLET_PROJECT_ID } = getConfig()

type WalletConfig = {
  id: 'metamask' | 'trust' | 'zerion'
  name: string
  imageId?: string
  IconComponent?: React.ComponentType<{ boxSize?: string }>
}

const WALLET_CONFIGS: WalletConfig[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    IconComponent: MetaMaskIcon,
  },
  {
    id: 'trust',
    name: 'Trust',
    imageId: '7677b54f-3486-46e2-4e37-bf8747814f00',
  },
  {
    id: 'zerion',
    name: 'Zerion',
    imageId: '73f6f52f-7862-49e7-bb85-ba93ab72cc00',
  },
]

/**
 * Direct WalletConnect connection button
 * Allows direct connection to specific wallets without showing the WalletConnect modal
 */
export const WalletConnectDirectButton = () => {
  const { connectToWallet, error } = useDirectWalletConnect()
  const { state, dispatch } = useWallet()
  const [loadingWallet, setLoadingWallet] = useState<'metamask' | 'trust' | 'zerion' | null>(null)
  const [mobilePending, setMobilePending] = useState(false)

  // Check if we're connected after returning from wallet on mobile
  useEffect(() => {
    if (isMobile && mobilePending && loadingWallet) {
      const checkInterval = setInterval(() => {
        const provider = (window as any).walletConnectProvider

        if ((provider?.session && provider?.accounts?.length > 0) || state.isConnected) {
          clearInterval(checkInterval)
          setMobilePending(false)
          setLoadingWallet(null) // Clear loading state after successful connection
          // Close modal when connection is detected
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        }
      }, POLLING_INTERVAL_MS)

      // Stop checking after timeout
      const timeout = setTimeout(() => {
        clearInterval(checkInterval)
        setMobilePending(false)
        setLoadingWallet(null) // Clear loading state on timeout
      }, CONNECTION_TIMEOUT_MS)

      return () => {
        clearInterval(checkInterval)
        clearTimeout(timeout)
      }
    }
  }, [mobilePending, state.isConnected, loadingWallet, dispatch])

  // Show error if one occurs
  useEffect(() => {
    if (error) {
      console.error('Direct connection error:', error)
      setLoadingWallet(null)
      setMobilePending(false)
    }
  }, [error])

  const handleDirectConnect = useCallback(
    async (walletId: 'metamask' | 'trust' | 'zerion') => {
      setLoadingWallet(walletId)

      try {
        await connectToWallet(walletId)

        // On mobile, connection happens async
        if (isMobile) {
          setMobilePending(true)
        }
      } catch (error) {
        console.error('Direct connection failed:', error)
        setLoadingWallet(null)
        setMobilePending(false)
      }
    },
    [connectToWallet],
  )

  const handleMetaMaskClick = useCallback(
    () => handleDirectConnect('metamask'),
    [handleDirectConnect],
  )
  const handleTrustClick = useCallback(() => handleDirectConnect('trust'), [handleDirectConnect])
  const handleZerionClick = useCallback(() => handleDirectConnect('zerion'), [handleDirectConnect])

  const renderWalletIcon = (wallet: WalletConfig) => {
    if (wallet.IconComponent) {
      return (
        <Flex boxSize='64px' align='center' justify='center' bg='white' borderRadius='lg' p={2}>
          <wallet.IconComponent boxSize='48px' />
        </Flex>
      )
    }
    if (wallet.imageId) {
      return (
        <Image
          src={`https://explorer-api.walletconnect.com/v3/logo/md/${wallet.imageId}?projectId=${VITE_WALLET_CONNECT_WALLET_PROJECT_ID}`}
          boxSize='64px'
          borderRadius='lg'
        />
      )
    }
    return null
  }

  return (
    <Flex gap={4} mt={4} align='stretch'>
      {/* MetaMask */}
      <Button
        onClick={handleMetaMaskClick}
        isDisabled={loadingWallet === 'metamask'}
        variant='ghost'
        height='auto'
        minH='120px'
        py={4}
        px={3}
        whiteSpace='normal'
        flex={1}
      >
        <Flex direction='column' align='center' justify='center' width='full'>
          {loadingWallet === 'metamask' ? (
            <Spinner thickness='4px' speed='0.65s' boxSize='64px' />
          ) : (
            renderWalletIcon(WALLET_CONFIGS[0])
          )}
          <Flex align='center' gap={1.5} mt={3}>
            <Text fontSize='sm' fontWeight='medium'>
              {WALLET_CONFIGS[0].name}
            </Text>
            <Circle size='20px' bg='blue.500'>
              <WalletConnectCurrentColorIcon boxSize='12px' color='white' />
            </Circle>
          </Flex>
        </Flex>
      </Button>

      {/* Trust */}
      <Button
        onClick={handleTrustClick}
        isDisabled={loadingWallet === 'trust'}
        variant='ghost'
        height='auto'
        minH='120px'
        py={4}
        px={3}
        whiteSpace='normal'
        flex={1}
      >
        <Flex direction='column' align='center' justify='center' width='full'>
          {loadingWallet === 'trust' ? (
            <Spinner thickness='4px' speed='0.65s' boxSize='64px' />
          ) : (
            renderWalletIcon(WALLET_CONFIGS[1])
          )}
          <Flex align='center' gap={1.5} mt={3}>
            <Text fontSize='sm' fontWeight='medium'>
              {WALLET_CONFIGS[1].name}
            </Text>
            <Circle size='20px' bg='blue.500'>
              <WalletConnectCurrentColorIcon boxSize='12px' color='white' />
            </Circle>
          </Flex>
        </Flex>
      </Button>

      {/* Zerion */}
      <Button
        onClick={handleZerionClick}
        isDisabled={loadingWallet === 'zerion'}
        variant='ghost'
        height='auto'
        minH='120px'
        py={4}
        px={3}
        whiteSpace='normal'
        flex={1}
      >
        <Flex direction='column' align='center' justify='center' width='full'>
          {loadingWallet === 'zerion' ? (
            <Spinner thickness='4px' speed='0.65s' boxSize='64px' />
          ) : (
            renderWalletIcon(WALLET_CONFIGS[2])
          )}
          <Flex align='center' gap={1.5} mt={3}>
            <Text fontSize='sm' fontWeight='medium'>
              {WALLET_CONFIGS[2].name}
            </Text>
            <Circle size='20px' bg='blue.500'>
              <WalletConnectCurrentColorIcon boxSize='12px' color='white' />
            </Circle>
          </Flex>
        </Flex>
      </Button>
    </Flex>
  )
}
