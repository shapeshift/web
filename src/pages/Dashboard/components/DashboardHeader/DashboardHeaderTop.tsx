import { ArrowDownIcon, ArrowUpIcon, SearchIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Box,
  Button,
  Container,
  Flex,
  IconButton,
  Text,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import type { Property } from 'csstype'
import { memo, useCallback, useMemo } from 'react'
import { FaExpand, FaRegCreditCard } from 'react-icons/fa'
import { FiSettings } from 'react-icons/fi'
import { IoEllipsisHorizontal, IoSwapVerticalSharp } from 'react-icons/io5'
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
import { selectHighestMarketCapFeeAsset } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const mobileButtonRowDisplay = { base: 'flex', md: 'none' }
const desktopButtonGroupDisplay = { base: 'none', md: 'flex' }
const containerPadding = { base: 6, '2xl': 8 }
const containerGap = { base: 6, md: 6 }
const containerInnerFlexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const profileGridColumn = { base: 2, md: 1 }
const profileGridTemplate = { base: '1fr auto 1fr', md: '1fr 1fr' }

const arrowUpIcon = <ArrowUpIcon />
const arrowDownIcon = <ArrowDownIcon />
const ioSwapVerticalSharpIcon = <IoSwapVerticalSharp />
const moreIcon = isMobileApp ? <FiSettings /> : <IoEllipsisHorizontal />
const swapIcon = <SwapIcon boxSize={6} color='blue.200' />
const buyIcon = (
  <Box color='blue.200'>
    <FaRegCreditCard size={24} />
  </Box>
)
const sendIcon = <SendIcon boxSize='6' color='blue.200' />
const receiveIcon = <ArrowDownIcon boxSize={6} color='blue.200' />
const searchIcon = <SearchIcon />
const qrCodeIcon = <FaExpand />

const netWorth = (
  <Flex alignItems='center' flexDir={containerInnerFlexDir} gap={4} gridColumn={profileGridColumn}>
    <ProfileAvatar />
    <WalletBalance />
  </Flex>
)

type MobileButtonProps = {
  icon: React.ReactNode
  label: string
  onClick: () => void
  isDisabled?: boolean
}

const MobileButton = ({ icon, label, onClick, isDisabled }: MobileButtonProps) => (
  <Button
    size='md'
    width='75px'
    height='75px'
    bg='rgba(127, 153, 251, 0.2)'
    borderRadius='xl'
    alignItems='center'
    onClick={onClick}
    isDisabled={isDisabled}
  >
    <VStack spacing={2} justify='center' align='center'>
      {icon}
      <Text fontSize='sm' fontWeight='medium' color='blue.200'>
        {label}
      </Text>
    </VStack>
  </Button>
)

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
    state: { isConnected },
  } = useWallet()

  const navigate = useNavigate()
  const send = useModal('send')
  const receive = useModal('receive')
  const qrCode = useModal('qrCode')
  const fiatRamps = useModal('fiatRamps')

  const defaultAsset = useAppSelector(selectHighestMarketCapFeeAsset)

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
    if (!defaultAsset) return
    fiatRamps.open({ assetId: defaultAsset.assetId, fiatRampAction: FiatRampAction.Buy })
  }, [fiatRamps, defaultAsset])

  const mobileButtons = useMemo(
    () => (
      <Flex mt={4} gap={6} width='100%' justifyContent='center' display={mobileButtonRowDisplay}>
        <MobileButton
          icon={swapIcon}
          label={translate('navBar.tradeShort')}
          onClick={handleTradeClick}
        />
        <MobileButton
          icon={buyIcon}
          label={translate('fiatRamps.buy')}
          onClick={handleBuyClick}
          isDisabled={!isConnected}
        />
        <MobileButton
          icon={sendIcon}
          label={translate('common.send')}
          onClick={handleSendClick}
          isDisabled={!isConnected}
        />
        <MobileButton
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
        <Container
          width='full'
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
          <Flex
            justifyContent='flex-end'
            gap={2}
            gridColumn={3}
            display={mobileButtonRowDisplay}
            position='absolute'
            right={1}
            top={
              'calc(env(safe-area-inset-top) + var(--safe-area-inset-top) + var(--chakra-space-4))'
            }
          >
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
            <IconButton isRound icon={moreIcon} aria-label='Settings' onClick={onOpen} />
          </Flex>
        </Container>
        {mobileButtons}
        {mobileDrawer}
        <GlobalSearchModal
          isOpen={isSearchOpen}
          onClose={onSearchClose}
          onOpen={onSearchOpen}
          onToggle={onSearchToggle}
        />
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
