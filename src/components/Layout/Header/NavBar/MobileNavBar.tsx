import { ArrowDownIcon } from '@chakra-ui/icons'
import type { CenterProps } from '@chakra-ui/react'
import {
  Button,
  Center,
  Flex,
  IconButton,
  SimpleGrid,
  Stack,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import { union } from 'lodash'
import React, { memo, useCallback, useLayoutEffect, useMemo } from 'react'
import { FaRegCreditCard } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { routes } from 'Routes/RoutesCommon'
import { QRCodeIcon } from 'components/Icons/QRCode'
import { SendIcon } from 'components/Icons/SendIcon'
import { SwapIcon } from 'components/Icons/SwapIcon'
import { Dialog } from 'components/Modal/components/Dialog'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogHeader } from 'components/Modal/components/DialogHeader'
import { RawText } from 'components/Text'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useModal } from 'hooks/useModal/useModal'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { MobileNavLink } from './MobileNavLink'

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
}

const actionMenuButtonHover = { bg: 'transparent' }
const actionButtonActive = { opacity: 0.5, bg: 'transparent' }

const ActionMenuButton: React.FC<ActionMenuButtonProps> = ({
  icon,
  title,
  body,
  iconColor = 'blue.500',
  onClick,
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
  const bg = useColorModeValue(
    `linear-gradient(
      to top,
      hsl(0, 0%, 100%) 0%,
      hsla(0, 0%, 100%, 0.987) 18%,
      hsla(0, 0%, 100%, 0.951) 32.5%,
      hsla(0, 0%, 100%, 0.896) 43.8%,
      hsla(0, 0%, 100%, 0.825) 52.4%,
      hsla(0, 0%, 100%, 0.741) 58.8%,
      hsla(0, 0%, 100%, 0.648) 63.4%,
      hsla(0, 0%, 100%, 0.55) 66.7%,
      hsla(0, 0%, 100%, 0.45) 69.1%,
      hsla(0, 0%, 100%, 0.352) 71.1%,
      hsla(0, 0%, 100%, 0.259) 73.2%,
      hsla(0, 0%, 100%, 0.175) 75.7%,
      hsla(0, 0%, 100%, 0.104) 79.2%,
      hsla(0, 0%, 100%, 0.049) 84.1%,
      hsla(0, 0%, 100%, 0.013) 90.9%,
      hsla(0, 0%, 100%, 0) 100%
    );`,
    `linear-gradient(
      to top,
      hsl(211, 11%, 7%) 0%,
      hsla(211, 11%, 7%, 0.987) 18.4%,
      hsla(211, 11%, 7%, 0.951) 33.7%,
      hsla(211, 11%, 7%, 0.896) 46.3%,
      hsla(211, 11%, 7%, 0.825) 56.5%,
      hsla(211, 11%, 7%, 0.741) 64.6%,
      hsla(211, 11%, 7%, 0.648) 70.9%,
      hsla(211, 11%, 7%, 0.55) 75.8%,
      hsla(211, 11%, 7%, 0.45) 79.5%,
      hsla(211, 11%, 7%, 0.352) 82.4%,
      hsla(211, 11%, 7%, 0.259) 84.7%,
      hsla(211, 11%, 7%, 0.175) 86.9%,
      hsla(211, 11%, 7%, 0.104) 89.2%,
      hsla(211, 11%, 7%, 0.049) 92%,
      hsla(211, 11%, 7%, 0.013) 95.4%,
      hsla(211, 11%, 7%, 0) 100%
    );`,
  )
  const { isOpen, onClose, onOpen } = useDisclosure()
  const send = useModal('send')
  const receive = useModal('receive')
  const qrCode = useModal('qrCode')
  const { routes: pluginRoutes } = usePlugins()
  const history = useHistory()
  const allRoutes = useMemo(
    () =>
      union(routes, pluginRoutes)
        .filter(route => !route.disable && !route.hide && route.mobileNav)
        // route mobileNav discriminated union narrowing is lost by the Array.prototype.sort() call
        .sort((a, b) => bnOrZero(a.priority!).minus(b.priority!).toNumber()),
    [pluginRoutes],
  )
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
    onClose()
    send.open({})
  }, [onClose, send])

  const handleReceiveClick = useCallback(() => {
    onClose()
    receive.open({})
  }, [onClose, receive])

  const handleTradeClick = useCallback(() => {
    onClose()
    history.push('/trade')
  }, [history, onClose])

  const handleBuyClick = useCallback(() => {
    onClose()
    history.push('/buy-crypto')
  }, [history, onClose])

  return (
    <>
      <SimpleGrid
        position='fixed'
        bottom={0}
        left={0}
        width='100%'
        gridTemplateColumns='1fr 1fr 1fr 1fr 1fr'
        bgImage={bg}
        pt={6}
        zIndex='banner'
        alignItems='center'
        paddingBottom='calc(env(safe-area-inset-bottom, 16px) - 16px)'
        display={displayProp}
        className='mobile-nav'
      >
        {allRoutes.map(route => (
          <MobileNavLink key={route.path} {...route} />
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
      <Dialog isOpen={isOpen} onClose={onClose} height='auto'>
        <DialogHeader />
        <DialogBody
          pb='calc(env(safe-area-inset-bottom) + 2rem)'
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
          />
          <ActionMenuButton
            onClick={handleReceiveClick}
            iconColor='green.600'
            icon={receiveIcon}
            title={translate('navBar.actionMenu.receive.title')}
            body={translate('navBar.actionMenu.receive.body')}
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
          />
        </DialogBody>
      </Dialog>
    </>
  )
})
