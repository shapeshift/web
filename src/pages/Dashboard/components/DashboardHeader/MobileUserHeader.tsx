import { ChevronDownIcon, SearchIcon } from '@chakra-ui/icons'
import { Flex, IconButton, Text } from '@chakra-ui/react'
import { useCallback, useLayoutEffect, useMemo } from 'react'
import { FaExpand } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { ProfileAvatar } from '../ProfileAvatar/ProfileAvatar'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { useMipdProviders } from '@/lib/mipd'
import { vibrate } from '@/lib/vibrate'
import { selectWalletRdns } from '@/state/slices/localWalletSlice/selectors'
import { useAppSelector } from '@/state/store'

const searchIcon = <SearchIcon />
const qrCodeIcon = <FaExpand />

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

  const maybeRdns = useAppSelector(selectWalletRdns)

  const mipdProviders = useMipdProviders()
  const maybeMipdProvider = useMemo(
    () => mipdProviders.find(provider => provider.info.rdns === maybeRdns),
    [mipdProviders, maybeRdns],
  )

  useLayoutEffect(() => {
    if (window.visualViewport) {
      const visualViewport = window.visualViewport
      const fixPosition = () => {
        const body = document.body
        const header = document.querySelector('.mobile-user-header')

        if (body && header) {
          body.style.setProperty('--mobile-header-user-offset', `${header.clientHeight}px`)
        }
      }
      visualViewport.addEventListener('resize', fixPosition)
      fixPosition()
      return () => {
        window.removeEventListener('resize', fixPosition)
      }
    }
  }, [])

  const label = useMemo(
    () => maybeMipdProvider?.info?.name || walletInfo?.meta?.label || walletInfo?.name,
    [walletInfo, maybeMipdProvider?.info?.name],
  )

  const handleOpen = useCallback(() => {
    vibrate('heavy')
    onOpen()
  }, [onOpen])

  return (
    <Flex
      className='mobile-user-header'
      justifyContent='space-between'
      width='100%'
      display={mobileButtonRowDisplay}
    >
      <Flex align='center' onClick={handleOpen}>
        <ProfileAvatar size='md' borderRadius='full' />
        <Text ml={2} fontWeight='semibold' fontSize='md'>
          {label ?? translate('common.connectWallet')}
        </Text>
        <ChevronDownIcon ml={1} boxSize='20px' />
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
