import { Avatar, Button, Circle, Flex, Spinner, Text } from '@chakra-ui/react'
import type { ReactElement } from 'react'
import { useMemo } from 'react'

import { WalletConnectCurrentColorIcon } from '@/components/Icons/WalletConnectIcon'

const WalletConnectBadge = () => (
  <Circle size='16px' bg='#3B99FC'>
    <WalletConnectCurrentColorIcon boxSize='10px' color='white' />
  </Circle>
)

type DirectWalletCardProps = {
  name: string
  imageUrl?: string
  walletIcon?: ReactElement
  isLoading?: boolean
  isDisabled?: boolean
  onClick: () => void
}

const spinner = <Spinner thickness='4px' speed='0.65s' boxSize='32px' />

export const DirectWalletCard = ({
  name,
  imageUrl,
  walletIcon,
  isLoading = false,
  isDisabled = false,
  onClick,
}: DirectWalletCardProps) => {
  const icon = useMemo(() => {
    if (isLoading) {
      return <Avatar icon={spinner} size='xl' borderRadius='lg' bg='white' />
    }
    if (walletIcon) {
      return <Avatar size='xl' icon={walletIcon} borderRadius='lg' bg='white' />
    }
    return <Avatar size='xl' src={imageUrl} borderRadius='lg' />
  }, [isLoading, imageUrl, walletIcon])

  return (
    <Button
      onClick={onClick}
      isDisabled={isDisabled || isLoading}
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
            {name}
          </Text>
          <WalletConnectBadge />
        </Flex>
      </Flex>
    </Button>
  )
}
