import { Avatar, Button, Circle, Flex, Spinner, Text } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'

import type { WalletConfig, WalletConnectWalletId } from '../constants'
import { WALLET_CONFIGS } from '../constants'
import { useDirectWalletConnect } from '../useDirectConnect'

import { WalletConnectCurrentColorIcon } from '@/components/Icons/WalletConnectIcon'

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

  return (
    <Flex px={6} pt={6} justifyContent='space-between' gap={6}>
      {WALLET_CONFIGS.map(wallet => (
        <DirectWalletButton
          key={wallet.id}
          wallet={wallet}
          isLoading={loadingWallet === wallet.id}
          onConnect={handleDirectConnect}
        />
      ))}
    </Flex>
  )
}
