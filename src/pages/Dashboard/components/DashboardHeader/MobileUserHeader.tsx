import { SearchIcon } from '@chakra-ui/icons'
import { Box, Flex, IconButton, Text } from '@chakra-ui/react'
import { FaExpand } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { ProfileAvatar } from '../ProfileAvatar/ProfileAvatar'

import { useWallet } from '@/hooks/useWallet/useWallet'

const searchIcon = <SearchIcon />
const qrCodeIcon = (
  <Box>
    <FaExpand />
  </Box>
)

const mobileButtonRowDisplay = { base: 'flex', md: 'none' }

type MobileUserHeaderPrps = {
  onSearchOpen: () => void
  handleQrCodeClick: () => void
  onOpen: () => void
}

export const MobileUserHeader = ({
  onSearchOpen,
  handleQrCodeClick,
  onOpen,
}: MobileUserHeaderPrps) => {
  const translate = useTranslate()

  const {
    state: { walletInfo },
  } = useWallet()

  return (
    <Flex justifyContent='space-between' width='100%' display={mobileButtonRowDisplay}>
      <Flex align='center' onClick={onOpen}>
        <ProfileAvatar size='md' borderRadius='full' />
        <Text ml={2} fontWeight='semibold' fontSize='md'>
          {(walletInfo?.meta?.label || walletInfo?.name) ?? translate('common.connectWallet')}
        </Text>
      </Flex>
      <Flex gap={2}>
        <IconButton
          icon={searchIcon}
          aria-label={translate('common.search')}
          onClick={onSearchOpen}
          isRound
        />
        <IconButton
          icon={qrCodeIcon}
          aria-label={translate('modals.send.qrCode')}
          onClick={handleQrCodeClick}
          isRound
        />
      </Flex>
    </Flex>
  )
}
