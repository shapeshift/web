import { ArrowDownIcon } from '@chakra-ui/icons'
import type { CenterProps } from '@chakra-ui/react'
import {
  Button,
  Center,
  Flex,
  IconButton,
  SimpleGrid,
  Stack,
  useDisclosure,
} from '@chakra-ui/react'
import { union } from 'lodash'
import type { JSX } from 'react'
import React, { memo, useCallback, useLayoutEffect, useMemo } from 'react'
import { FaRegCreditCard } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { MobileNavLink } from './MobileNavLink'

import { QRCodeIcon } from '@/components/Icons/QRCode'
import { SendIcon } from '@/components/Icons/SendIcon'
import { SwapIcon } from '@/components/Icons/SwapIcon'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { RawText } from '@/components/Text'
import { usePlugins } from '@/context/PluginProvider/PluginProvider'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import type { Route } from '@/Routes/helpers'
import { routes } from '@/Routes/RoutesCommon'

const displayProp = { base: 'grid', md: 'none' }

const swapIcon = <SwapIcon />
const sendIcon = <SendIcon />
const receiveIcon = <ArrowDownIcon />
const buyIcon = <FaRegCreditCard />
const qrCodeIcon = <QRCodeIcon />

type ActionMenuButtonProps = {
  icon?: JSX.Element
  title: string
  body: string
  onClick?: () => void

  iconColor?: CenterProps['bg']
  isDisabled?: boolean
}

const actionMenuButtonHover = { bg: 'transparent' }
const actionButtonActive = { opacity: 0.5, bg: 'transparent' }

const ActionMenuButton: React.FC<ActionMenuButtonProps> = ({
  icon,
  title,
  body,
  iconColor = 'blue.500',
  onClick,

  isDisabled,
}) => {
  return (
    <Button
      height='auto'
      onClick={onClick}
      variant='ghost'
      display='flex'
      alignItems='center'
      width='full'
      color='text.base'
      justifyContent='flex-start'
      textAlign='left'
      gap={4}
      px={0}
      isDisabled={isDisabled}
      _hover={actionMenuButtonHover}
      _active={actionButtonActive}
    >
      <Center flexShrink={0} bg={iconColor} boxSize='48px' borderRadius='full' fontSize='xl'>
        {icon}
      </Center>
      <Stack spacing={1} flex={1}>
        <RawText fontWeight='semibold'>{title}</RawText>
        <RawText color='text.subtle' fontWeight='normal'>
          {body}
        </RawText>
      </Stack>
    </Button>
  )
}

export const MobileNavBar = memo(() => {
  const translate = useTranslate()
  const { isOpen, onClose, onOpen } = useDisclosure()
  const {
    state: { isConnected },
  } = useWallet()
  const send = useModal('send')
  const receive = useModal('receive')
  const qrCode = useModal('qrCode')
  const { routes: pluginRoutes } = usePlugins()
  const mixpanel = getMixPanel()
  const navigate = useNavigate()
  const allRoutes = useMemo(() => {
    return union(routes, pluginRoutes)
      .filter(
        (
          route,
        ): route is Extract<Route, { priority: number }> & Extract<Route, { label: string }> =>
          !route.disable && !route.hide && !!route.mobileNav,
      )
      .sort((a, b) => bnOrZero(a.priority).minus(b.priority).toNumber())
  }, [pluginRoutes])
  useLayoutEffect(() => {
    const body = document.body
    const nav = document.querySelector('.mobile-nav')
    if (window.visualViewport) {
      const vv = window.visualViewport
      const fixPosition = () => {
        if (body && nav) {
          body.style.setProperty('--mobile-nav-offset', `${nav.clientHeight}px`)
        }
      }
      vv.addEventListener('resize', fixPosition)
      fixPosition()
      return () => {
        window.removeEventListener('resize', fixPosition)
      }
    }
  }, [])

  const handleQrCodeClick = useCallback(() => {
    onClose()
    qrCode.open({})
  }, [onClose, qrCode])

  const handleSendClick = useCallback(() => {
    mixpanel?.track(MixPanelEvent.SendClick)
    onClose()
    send.open({})
  }, [mixpanel, onClose, send])

  const handleReceiveClick = useCallback(() => {
    onClose()
    receive.open({})
  }, [onClose, receive])

  const handleTradeClick = useCallback(() => {
    onClose()
    navigate('/trade')
  }, [navigate, onClose])

  const handleBuyClick = useCallback(() => {
    onClose()
    navigate('/buy-crypto')
  }, [navigate, onClose])

  return (
    <>
      <SimpleGrid
        position='fixed'
        bottom={0}
        left={0}
        width='100%'
        gridTemplateColumns='1fr 1fr 1fr 1fr 1fr'
        zIndex='banner'
        alignItems='center'
        paddingBottom='calc(env(safe-area-inset-bottom, 16px) - 16px + var(--safe-area-inset-bottom))'
        bg='background.surface.base'
        display={displayProp}
        className='mobile-nav'
      >
        {allRoutes.map((route, index) => (
          <MobileNavLink key={route.path} {...route} order={index < 2 ? index + 1 : index + 2} />
        ))}
        <Flex alignItems='center' justifyContent='center' order={3}>
          <IconButton
            size='lg'
            icon={swapIcon}
            isRound
            colorScheme='blue'
            aria-label='action menu'
            onClick={onOpen}
          />
        </Flex>
      </SimpleGrid>
      <Dialog isOpen={isOpen} onClose={onClose} height='auto' isDisablingPropagation={false}>
        <DialogHeader />
        <DialogBody
          pb='calc(env(safe-area-inset-bottom) + 2rem + var(--safe-area-inset-bottom))'
          display='flex'
          flexDir='column'
          gap={8}
          px={6}
        >
          <ActionMenuButton
            onClick={handleSendClick}
            icon={sendIcon}
            title={translate('navBar.actionMenu.send.title')}
            body={translate('navBar.actionMenu.send.body')}
            isDisabled={!isConnected}
          />
          <ActionMenuButton
            onClick={handleReceiveClick}
            iconColor='green.600'
            icon={receiveIcon}
            title={translate('navBar.actionMenu.receive.title')}
            body={translate('navBar.actionMenu.receive.body')}
            isDisabled={!isConnected}
          />
          <ActionMenuButton
            onClick={handleTradeClick}
            iconColor='purple.500'
            icon={swapIcon}
            title={translate('navBar.actionMenu.trade.title')}
            body={translate('navBar.actionMenu.trade.body')}
          />
          <ActionMenuButton
            onClick={handleBuyClick}
            icon={buyIcon}
            title={translate('navBar.actionMenu.buy.title')}
            body={translate('navBar.actionMenu.buy.body')}
          />
          <ActionMenuButton
            onClick={handleQrCodeClick}
            icon={qrCodeIcon}
            title={translate('navBar.actionMenu.qrcode.title')}
            body={translate('navBar.actionMenu.qrcode.body')}
            isDisabled={!isConnected}
          />
        </DialogBody>
      </Dialog>
    </>
  )
})
