import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import { Button, Container, Flex, IconButton, useDisclosure } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { memo, useCallback } from 'react'
import { FiSettings } from 'react-icons/fi'
import { IoEllipsisHorizontal, IoSwapVerticalSharp } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { ProfileAvatar } from '../ProfileAvatar/ProfileAvatar'
import { DashboardDrawer } from './DashboardDrawer'
import { WalletBalance } from './WalletBalance'

import { QRCodeIcon } from '@/components/Icons/QRCode'
import { MobileWalletDialog } from '@/components/MobileWalletDialog/MobileWalletDialog'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isMobile } from '@/lib/globals'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'

const qrCodeIcon = <QRCodeIcon />
const arrowUpIcon = <ArrowUpIcon />
const arrowDownIcon = <ArrowDownIcon />
const ioSwapVerticalSharpIcon = <IoSwapVerticalSharp />
const moreIcon = isMobile ? <FiSettings /> : <IoEllipsisHorizontal />

const ButtonRowDisplay = { base: 'flex', md: 'none' }

const containerPadding = { base: 6, '2xl': 8 }
const containerGap = { base: 6, md: 6 }
const containerInnerFlexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const buttonGroupDisplay = { base: 'none', md: 'flex' }

const profileGridColumn = { base: 2, md: 1 }
const profileGridTemplate = { base: '1fr 1fr 1fr', md: '1fr 1fr' }

export const DashboardHeaderTop = memo(() => {
  const { isOpen, onClose, onOpen } = useDisclosure()
  const mixpanel = getMixPanel()
  const translate = useTranslate()
  const {
    state: { isConnected },
  } = useWallet()

  const navigate = useNavigate()
  const send = useModal('send')
  const receive = useModal('receive')
  const qrCode = useModal('qrCode')

  const handleQrCodeClick = useCallback(() => {
    qrCode.open({})
  }, [qrCode])

  const handleSendClick = useCallback(() => {
    mixpanel?.track(MixPanelEvent.SendClick)
    send.open({})
  }, [send, mixpanel])

  const handleReceiveClick = useCallback(() => {
    receive.open({})
  }, [receive])

  const handleTradeClick = useCallback(() => {
    navigate('/trade')
  }, [navigate])

  return (
    <Container
      width='full'
      display='grid'
      gridTemplateColumns={profileGridTemplate}
      maxWidth='container.4xl'
      px={containerPadding}
      pt={4}
      pb={4}
      alignItems='flex-start'
      justifyContent='space-between'
      gap={containerGap}
    >
      <Flex
        alignItems='center'
        flexDir={containerInnerFlexDir}
        gap={4}
        gridColumn={profileGridColumn}
      >
        <ProfileAvatar />
        <WalletBalance />
      </Flex>
      <Flex
        gridColumn={3}
        gap={4}
        flexWrap={'wrap'}
        justifyContent={'center'}
        display={buttonGroupDisplay}
      >
        <Button isDisabled={!isConnected} onClick={handleQrCodeClick} leftIcon={qrCodeIcon}>
          {translate('modals.send.qrCode')}
        </Button>
        <Button isDisabled={!isConnected} onClick={handleSendClick} leftIcon={arrowUpIcon}>
          {translate('common.send')}
        </Button>
        <Button isDisabled={!isConnected} onClick={handleReceiveClick} leftIcon={arrowDownIcon}>
          {translate('common.receive')}
        </Button>
        <Button onClick={handleTradeClick} leftIcon={ioSwapVerticalSharpIcon}>
          {translate('navBar.tradeShort')}
        </Button>
      </Flex>
      <Flex
        justifyContent='flex-end'
        alignItems='flex-start'
        gridColumn={3}
        display={ButtonRowDisplay}
      >
        <IconButton isRound icon={moreIcon} aria-label='Settings' onClick={onOpen} />
      </Flex>
      {isMobile ? (
        <MobileWalletDialog isOpen={isOpen} onClose={onClose} />
      ) : (
        <DashboardDrawer isOpen={isOpen} onClose={onClose} />
      )}
    </Container>
  )
})
