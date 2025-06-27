import { ArrowDownIcon, ArrowUpIcon, SearchIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Box,
  Button,
  Container,
  Flex,
  IconButton,
  Text,
  useColorModeValue,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import type { Property } from 'csstype'
import { memo, useCallback, useMemo } from 'react'
import { FaExpand, FaRegCreditCard } from 'react-icons/fa'
import { IoSwapVerticalSharp } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { ProfileAvatar } from '../ProfileAvatar/ProfileAvatar'
import { DashboardDrawer } from './DashboardDrawer'
import { WalletBalance } from './WalletBalance'

import { Display } from '@/components/Display'
import { SendIcon } from '@/components/Icons/SendIcon'
import { SwapIcon } from '@/components/Icons/SwapIcon'
import { GlobalSearchModal } from '@/components/Layout/Header/GlobalSearch/GlobalSearchModal'
import { MobileWalletDialog } from '@/components/MobileWalletDialog/MobileWalletDialog'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from '@/lib/globals'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'

const mobileButtonRowDisplay = { base: 'flex', md: 'none' }
const desktopButtonGroupDisplay = { base: 'none', md: 'flex' }
const containerPadding = { base: 6, '2xl': 8 }
const containerGap = { base: 6, md: 6 }
const containerInnerFlexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const profileGridColumn = { base: 2, md: 1 }
const profileGridTemplate = { base: '1fr auto 1fr', md: '1fr 1fr' }
const balanceFontSize = '4xl'

const arrowUpIcon = <ArrowUpIcon />
const arrowDownIcon = <ArrowDownIcon />
const ioSwapVerticalSharpIcon = <IoSwapVerticalSharp />
const swapIcon = <SwapIcon boxSize={6} />
const buyIcon = (
  <Box>
    <FaRegCreditCard size={24} />
  </Box>
)
const sendIcon = <SendIcon boxSize='6' />
const receiveIcon = <ArrowDownIcon boxSize={6} />
const searchIcon = <SearchIcon />
const qrCodeIcon = (
  <Box>
    <FaExpand />
  </Box>
)

const netWorth = (
  // react-memo you're drunk, this is outside of component scope
  // eslint-disable-next-line react-memo/require-usememo
  <Flex alignItems='center' flexDir={containerInnerFlexDir} gap={4} gridColumn={profileGridColumn}>
    <WalletBalance balanceFontSize={balanceFontSize} />
  </Flex>
)

type MobileActionButtonProps = {
  icon: React.ReactNode
  label: string
  onClick: () => void
  isDisabled?: boolean
}

const MobileActionButton = ({ icon, label, onClick, isDisabled }: MobileActionButtonProps) => {
  const buttonBg = useColorModeValue(undefined, 'rgba(127, 153, 251, 0.2)')
  const colorScheme = useColorModeValue('blue', undefined)

  return (
    <Button
      size='md'
      width='80px'
      height='80px'
      bg={buttonBg}
      colorScheme={colorScheme}
      borderRadius='xl'
      alignItems='center'
      onClick={onClick}
      isDisabled={isDisabled}
    >
      <VStack spacing={2} justify='center' align='center'>
        {icon}
        <Text fontSize='sm' fontWeight='medium'>
          {label}
        </Text>
      </VStack>
    </Button>
  )
}

export const DashboardHeaderTop = memo(() => {
  const { isOpen, onClose, onOpen } = useDisclosure()
  const {
    isOpen: isSearchOpen,
    onClose: onSearchClose,
    onOpen: onSearchOpen,
    onToggle: onSearchToggle,
  } = useDisclosure()
  const mixpanel = getMixPanel()
  const translate = useTranslate()
  const {
    state: { walletInfo, isConnected },
  } = useWallet()

  const navigate = useNavigate()
  const send = useModal('send')
  const receive = useModal('receive')
  const qrCode = useModal('qrCode')
  const fiatRamps = useModal('fiatRamps')

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

  const handleBuyClick = useCallback(() => {
    fiatRamps.open({ assetId: undefined, fiatRampAction: FiatRampAction.Buy })
  }, [fiatRamps])

  const mobileButtons = useMemo(
    () => (
      <Flex mt={4} gap={3} width='100%' justifyContent='center' display={mobileButtonRowDisplay}>
        <MobileActionButton
          icon={swapIcon}
          label={translate('navBar.tradeShort')}
          onClick={handleTradeClick}
        />
        <MobileActionButton
          icon={buyIcon}
          label={translate('fiatRamps.buy')}
          onClick={handleBuyClick}
          isDisabled={!isConnected}
        />
        <MobileActionButton
          icon={sendIcon}
          label={translate('common.send')}
          onClick={handleSendClick}
          isDisabled={!isConnected}
        />
        <MobileActionButton
          icon={receiveIcon}
          label={translate('common.receive')}
          onClick={handleReceiveClick}
          isDisabled={!isConnected}
        />
      </Flex>
    ),
    [handleTradeClick, handleBuyClick, handleSendClick, handleReceiveClick, isConnected, translate],
  )

  const desktopButtons = useMemo(
    () => (
      <Flex
        gridColumn={3}
        gap={4}
        flexWrap={'wrap'}
        justifyContent={'center'}
        display={desktopButtonGroupDisplay}
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
    ),
    [
      handleQrCodeClick,
      handleSendClick,
      handleReceiveClick,
      handleTradeClick,
      isConnected,
      translate,
    ],
  )

  const mobileDrawer = useMemo(() => {
    if (isMobileApp) return <MobileWalletDialog isOpen={isOpen} onClose={onClose} />
    return <DashboardDrawer isOpen={isOpen} onClose={onClose} />
  }, [isOpen, onClose])

  return (
    <>
      <Display.Mobile>
        <>
          <Flex
            justifyContent='space-between'
            width='100%'
            pt={4}
            gap={2}
            gridColumn={3}
            display={mobileButtonRowDisplay}
            px={4}
          >
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
          <Container
            width='100%'
            display='grid'
            gridTemplateColumns={profileGridTemplate}
            maxWidth='container.4xl'
            px={containerPadding}
            pt={4}
            pb={4}
            gap={containerGap}
          >
            {netWorth}
            {desktopButtons}
          </Container>
          {mobileButtons}
          {mobileDrawer}
          <GlobalSearchModal
            isOpen={isSearchOpen}
            onClose={onSearchClose}
            onOpen={onSearchOpen}
            onToggle={onSearchToggle}
          />
        </>
      </Display.Mobile>
      <Display.Desktop>
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
          {netWorth}
          <Flex
            gridColumn={3}
            gap={4}
            flexWrap={'wrap'}
            justifyContent={'center'}
            display={desktopButtonGroupDisplay}
          >
            {desktopButtons}
          </Flex>
        </Container>
      </Display.Desktop>
    </>
  )
})
