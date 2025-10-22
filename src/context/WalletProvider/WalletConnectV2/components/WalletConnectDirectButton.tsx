import { Box, Button, Flex, Image, Spinner, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { isMobile } from 'react-device-detect'

import { useDirectWalletConnect } from '../useDirectConnect'

import { MetaMaskIcon } from '@/components/Icons/MetaMaskIcon'
import { WalletConnectIcon } from '@/components/Icons/WalletConnectIcon'
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
    name: 'Trust Wallet',
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

  const spinnerElement = useMemo(() => <Spinner size='sm' />, [])

  const handleMetaMaskClick = useCallback(
    () => handleDirectConnect('metamask'),
    [handleDirectConnect],
  )
  const handleTrustClick = useCallback(() => handleDirectConnect('trust'), [handleDirectConnect])
  const handleZerionClick = useCallback(() => handleDirectConnect('zerion'), [handleDirectConnect])

  const renderWalletIcon = (wallet: WalletConfig) => {
    if (wallet.IconComponent) {
      return <wallet.IconComponent boxSize='48px' />
    }
    if (wallet.imageId) {
      return (
        <Image
          src={`https://explorer-api.walletconnect.com/v3/logo/md/${wallet.imageId}?projectId=${VITE_WALLET_CONNECT_WALLET_PROJECT_ID}`}
          boxSize='48px'
          borderRadius='md'
        />
      )
    }
    return null
  }

  return (
    <Flex gap={4} mt={4}>
      {/* MetaMask */}
      <Button
        onClick={handleMetaMaskClick}
        isLoading={loadingWallet === 'metamask'}
        spinner={spinnerElement}
        variant='ghost'
        height='auto'
        py={4}
        px={3}
        whiteSpace='normal'
        position='relative'
        flex={1}
      >
        <Flex direction='column' align='center' width='full'>
          {renderWalletIcon(WALLET_CONFIGS[0])}
          <Text fontSize='sm' fontWeight='medium' mt={2}>
            {WALLET_CONFIGS[0].name}
          </Text>
          <Box position='absolute' top={1} right={1} opacity={0.6}>
            <WalletConnectIcon boxSize='16px' />
          </Box>
        </Flex>
      </Button>

      {/* Trust Wallet */}
      <Button
        onClick={handleTrustClick}
        isLoading={loadingWallet === 'trust'}
        spinner={spinnerElement}
        variant='ghost'
        height='auto'
        py={4}
        px={3}
        whiteSpace='normal'
        position='relative'
        flex={1}
      >
        <Flex direction='column' align='center' width='full'>
          {renderWalletIcon(WALLET_CONFIGS[1])}
          <Text fontSize='sm' fontWeight='medium' mt={2}>
            {WALLET_CONFIGS[1].name}
          </Text>
          <Box position='absolute' top={1} right={1} opacity={0.6}>
            <WalletConnectIcon boxSize='16px' />
          </Box>
        </Flex>
      </Button>

      {/* Zerion */}
      <Button
        onClick={handleZerionClick}
        isLoading={loadingWallet === 'zerion'}
        spinner={spinnerElement}
        variant='ghost'
        height='auto'
        py={4}
        px={3}
        whiteSpace='normal'
        position='relative'
        flex={1}
      >
        <Flex direction='column' align='center' width='full'>
          {renderWalletIcon(WALLET_CONFIGS[2])}
          <Text fontSize='sm' fontWeight='medium' mt={2}>
            {WALLET_CONFIGS[2].name}
          </Text>
          <Box position='absolute' top={1} right={1} opacity={0.6}>
            <WalletConnectIcon boxSize='16px' />
          </Box>
        </Flex>
      </Button>
    </Flex>
  )
}
