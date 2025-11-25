import {
  Avatar,
  Box,
  Button,
  Circle,
  Flex,
  Skeleton,
  SkeletonCircle,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { getDetectedWallets } from '../../MobileWallet/mobileMessageHandlers'
import type { WalletConfig, WalletConnectWalletId } from '../constants'
import { WALLET_CONFIGS } from '../constants'
import { useDirectWalletConnect } from '../useDirectConnect'

import { WalletConnectCurrentColorIcon } from '@/components/Icons/WalletConnectIcon'
import { isMobile } from '@/lib/globals'

const WalletConnectBadge = () => (
  <Circle size='16px' bg='#3B99FC'>
    <WalletConnectCurrentColorIcon boxSize='10px' color='white' />
  </Circle>
)

type DirectWalletButtonProps = {
  wallet: WalletConfig
  isLoading: boolean
  onConnect: (walletId: WalletConnectWalletId) => void
}

const spinner = <Spinner thickness='4px' speed='0.65s' boxSize='32px' />

export const DirectWalletButton = ({ wallet, isLoading, onConnect }: DirectWalletButtonProps) => {
  const handleClick = useCallback(() => onConnect(wallet.id), [onConnect, wallet.id])

  const walletIcon = useMemo(() => {
    if ('IconComponent' in wallet && wallet.IconComponent) {
      return <wallet.IconComponent boxSize='80%' />
    }
    return undefined
  }, [wallet])

  const icon = useMemo(() => {
    if (isLoading) {
      return <Avatar icon={spinner} size='xl' borderRadius='lg' bg='white' />
    }
    if (walletIcon) {
      return <Avatar size='xl' icon={walletIcon} borderRadius='lg' bg='white' />
    }
    return <Avatar size='xl' src={wallet.imageUrl} borderRadius='lg' />
  }, [isLoading, wallet, walletIcon])

  return (
    <Button
      onClick={handleClick}
      isDisabled={isLoading}
      variant='ghost'
      height='auto'
      minH='120px'
      color='text.base'
      p={0}
      whiteSpace='normal'
    >
      <Flex direction='column' align='center' justify='center' width='full'>
        {icon}
        <Flex align='center' gap={1.5} mt={3}>
          <Text fontSize='sm' fontWeight='medium'>
            {wallet.name}
          </Text>
          <WalletConnectBadge />
        </Flex>
      </Flex>
    </Button>
  )
}

export const WalletConnectDirectRow = () => {
  const { connect } = useDirectWalletConnect()
  const [loadingWallet, setLoadingWallet] = useState<WalletConnectWalletId | null>(null)
  const [wallets, setWallets] = useState<WalletConfig[]>([])
  const [isDetecting, setIsDetecting] = useState(isMobile)
  const [debugInfo, setDebugInfo] = useState<{
    detectedWallets: any[]
    installedWallets: any[]
    mappedWallets: WalletConfig[]
  } | null>(null)

  const handleDirectConnect = useCallback(
    async (walletId: WalletConnectWalletId) => {
      setLoadingWallet(walletId)

      try {
        await connect(walletId)
        setLoadingWallet(null)
      } catch (error) {
        console.error('Direct connection failed:', error)
        setLoadingWallet(null)
      }
    },
    [connect],
  )

  useEffect(() => {
    const detectWallets = async () => {
      if (!isMobile) {
        setWallets(WALLET_CONFIGS.slice(0, 3))
        setIsDetecting(false)
        return
      }

      try {
        const detectedWallets = await getDetectedWallets()
        const installedWallets = detectedWallets.filter(wallet => wallet.isInstalled)
        const mappedWallets = installedWallets
          .map(wallet => WALLET_CONFIGS.find(w => w.id === wallet.schema))
          .filter((wallet): wallet is WalletConfig => wallet !== undefined)
          .slice(0, 3)

        // Store debug info
        setDebugInfo({
          detectedWallets,
          installedWallets,
          mappedWallets,
        })

        setWallets(mappedWallets)
      } catch (error) {
        console.error('Failed to detect wallets:', error)
        setWallets(WALLET_CONFIGS.slice(0, 3))
      } finally {
        setIsDetecting(false)
      }
    }

    detectWallets()
  }, [])

  if (isDetecting) {
    return (
      <Flex px={6} pt={6} justifyContent='space-between' gap={6}>
        {[1, 2, 3].map(index => (
          <Flex
            key={index}
            direction='column'
            align='center'
            justify='center'
            width='full'
            minH='120px'
          >
            <SkeletonCircle size='96px' />
            <Skeleton height='20px' width='80px' mt={3} borderRadius='md' />
          </Flex>
        ))}
      </Flex>
    )
  }

  return (
    <Box>
      {/* Debug Information */}
      {isMobile && debugInfo && (
        <Box px={6} pt={4} pb={4} bg='yellow.100' borderRadius='md' mx={6} mb={4}>
          <Text fontSize='xs' fontWeight='bold' mb={2}>
            DEBUG: Wallet Detection
          </Text>
          <Box fontSize='xs' fontFamily='mono'>
            <Text fontWeight='semibold'>
              Detected Wallets ({debugInfo.detectedWallets.length}):
            </Text>
            <Box as='pre' fontSize='10px' overflow='auto' maxH='150px'>
              {JSON.stringify(debugInfo.detectedWallets, null, 2)}
            </Box>
            <Text fontWeight='semibold' mt={2}>
              Installed Wallets ({debugInfo.installedWallets.length}):
            </Text>
            <Box as='pre' fontSize='10px' overflow='auto' maxH='150px'>
              {JSON.stringify(debugInfo.installedWallets, null, 2)}
            </Box>
            <Text fontWeight='semibold' mt={2}>
              Mapped Wallets ({debugInfo.mappedWallets.length}):
            </Text>
            <Box as='pre' fontSize='10px' overflow='auto' maxH='150px'>
              {JSON.stringify(
                debugInfo.mappedWallets.map(w => ({ id: w.id, name: w.name })),
                null,
                2,
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* Wallet Buttons */}
      {wallets.length > 0 ? (
        <Flex px={6} pt={6} justifyContent='space-between' gap={6}>
          {wallets.map(wallet => (
            <DirectWalletButton
              key={wallet.id}
              wallet={wallet}
              isLoading={loadingWallet === wallet.id}
              onConnect={handleDirectConnect}
            />
          ))}
        </Flex>
      ) : (
        <Box px={6} pt={6}>
          <Text fontSize='sm' color='gray.500'>
            No wallets detected. See debug info above for details.
          </Text>
        </Box>
      )}
    </Box>
  )
}
