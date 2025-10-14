import type { AvatarProps } from '@chakra-ui/react'
import {
  Avatar,
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  IconButton,
  Stack,
  Text,
} from '@chakra-ui/react'
import {
  bscChainId,
  btcChainId,
  ethChainId,
  gnosisChainId,
  polygonChainId,
} from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { TbChevronRight } from 'react-icons/tb'

import { ChainIcon } from '@/components/ChainMenu'
import { FoxIcon } from '@/components/Icons/FoxIcon'
import { MetaMaskIcon } from '@/components/Icons/MetaMaskIcon'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { RawText } from '@/components/Text'

type MobileWebSelectProps = {
  isOpen: boolean
  onClose: () => void
}

export const WalletButton = ({
  name,
  icon,
  src,
}: {
  name: string
  icon?: AvatarProps['icon']
  src?: AvatarProps['src']
}) => {
  const after = useMemo(() => {
    return { content: `"${name}"`, inset: 0, fontSize: 'xs' }
  }, [name])
  const WalletIcon = useMemo(() => {
    return (
      <Avatar
        bg='white'
        size='xl'
        fontSize='65px'
        borderRadius='xl'
        borderEndRadius='xl'
        icon={icon}
        src={src}
      />
    )
  }, [icon, src])
  return (
    <IconButton
      variant='ghost'
      flexDir='column'
      height='auto'
      gap={2}
      icon={WalletIcon}
      aria-label='close dialog'
      _after={after}
    />
  )
}

const foxAvatarIcon = <FoxIcon />
const arrowForwardIcon = <TbChevronRight />

const metaMaskIcon = <MetaMaskIcon />
export const MobileWebSelect = ({ isOpen, onClose }: MobileWebSelectProps) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} height='auto'>
      <DialogBody padding={0}>
        <Stack spacing={8} pt={4} pb={6}>
          <Flex px={4} justifyContent='space-between'>
            <WalletButton icon={metaMaskIcon} name='Example Wallet' />
            <WalletButton icon={metaMaskIcon} name='Example Wallet' />
            <WalletButton icon={metaMaskIcon} name='Example Wallet' />
          </Flex>
          <HStack spacing={4}>
            <Divider />
            <Stack spacing={0} flexShrink={0} flexGrow={0} textAlign='center'>
              <RawText fontWeight='bold' fontSize='md'>
                Don't see your wallet?
              </RawText>
              <RawText fontSize='sm' color='text.subtle'>
                Connect to 480+ wallets
              </RawText>
            </Stack>
            <Divider />
          </HStack>
          <Box px={4}>
            <Button colorScheme='blue' size='lg' width='full'>
              View All Wallets
            </Button>
          </Box>
        </Stack>
      </DialogBody>
      <DialogFooter
        px={0}
        bg='background.surface.raised.accent'
        flexDir='column'
        gap={4}
        borderTopWidth={1}
        borderColor='border.base'
        pt={4}
      >
        <Flex px={4} width='full' justifyContent='space-between' alignItems='center'>
          <RawText fontWeight='bold'>Multi-Chain Wallets</RawText>
          <HStack>
            <ChainIcon size='xs' chainId={btcChainId} />
            <ChainIcon size='xs' chainId={ethChainId} />
            <ChainIcon size='xs' chainId={bscChainId} />
            <ChainIcon size='xs' chainId={polygonChainId} />
            <ChainIcon size='xs' chainId={gnosisChainId} />
          </HStack>
        </Flex>
        <Box px={2} width='full'>
          <Button
            variant='ghost'
            height='auto'
            py={2}
            px={2}
            justifyContent='space-between'
            size='lg'
            width='full'
            rightIcon={arrowForwardIcon}
          >
            <HStack spacing={4}>
              <Avatar size='lg' bg='blue.500' borderRadius='lg' icon={foxAvatarIcon} />
              <Text color='text.base'>ShapeShift Wallet</Text>
            </HStack>
          </Button>
        </Box>
      </DialogFooter>
    </Dialog>
  )
}
