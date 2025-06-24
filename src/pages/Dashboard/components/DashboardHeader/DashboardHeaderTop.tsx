import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import { Button, Container, Flex, IconButton, Text, useDisclosure, VStack } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { memo, useCallback, useMemo } from 'react'
import { isMobile } from 'react-device-detect'
import { FaRegCreditCard } from 'react-icons/fa'
import { FiSettings } from 'react-icons/fi'
import { IoEllipsisHorizontal, IoSwapVerticalSharp } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { ProfileAvatar } from '../ProfileAvatar/ProfileAvatar'
import { DashboardDrawer } from './DashboardDrawer'
import { WalletBalance } from './WalletBalance'

import { QRCodeIcon } from '@/components/Icons/QRCode'
import { SendIcon } from '@/components/Icons/SendIcon'
import { SwapIcon } from '@/components/Icons/SwapIcon'
import { MobileWalletDialog } from '@/components/MobileWalletDialog/MobileWalletDialog'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { selectHighestMarketCapFeeAsset } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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

const profileGridTemplate = { base: '1fr 1fr 1fr', md: '1fr 1fr' }

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
      <Text fontSize='sm' fontWeight='medium'>
        {label}
      </Text>
    </VStack>
  </Button>
)

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
      <Flex mt={4} gap={6}>
        <MobileButton
          icon={<SwapIcon boxSize={6} />}
          label={translate('navBar.tradeShort')}
          onClick={handleTradeClick}
        />
        <MobileButton
          icon={<FaRegCreditCard size={24} />}
          label={translate('fiatRamps.buy')}
          onClick={handleBuyClick}
          isDisabled={!isConnected}
        />
        <MobileButton
          icon={<SendIcon boxSize='6' />}
          label={translate('common.send')}
          onClick={handleSendClick}
          isDisabled={!isConnected}
        />
        <MobileButton
          icon={<ArrowDownIcon boxSize={6} />}
          label={translate('common.receive')}
          onClick={handleReceiveClick}
          isDisabled={!isConnected}
        />
      </Flex>
    ),
    [
      handleTradeClick,
      handleBuyClick,
      handleSendClick,
      handleReceiveClick,
      isConnected,
      translate,
      defaultAsset,
    ],
  )

  const desktopButtons = useMemo(
    () => (
      <>
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
      </>
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
      <Flex alignItems='center' flexDir={containerInnerFlexDir} gap={4}>
        <ProfileAvatar />
        <WalletBalance />
        {isMobile && mobileButtons}
      </Flex>
      <Flex
        gridColumn={3}
        gap={4}
        flexWrap={'wrap'}
        justifyContent={'center'}
        display={buttonGroupDisplay}
      >
        {!isMobile && desktopButtons}
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
