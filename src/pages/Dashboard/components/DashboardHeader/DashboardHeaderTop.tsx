import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import { Box, Button, Container, Flex, Text, VStack } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { memo, useCallback, useMemo } from 'react'
import { FaExpand, FaRegCreditCard } from 'react-icons/fa'
import { IoSwapVerticalSharp } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { vibrate } from '../../../../lib/vibrate'
import { WalletBalance } from './WalletBalance'

import { Display } from '@/components/Display'
import { SendIcon } from '@/components/Icons/SendIcon'
import { SwapIcon } from '@/components/Icons/SwapIcon'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { WalletBalanceChange } from '@/components/WalletBalanceChange/WalletBalanceChange'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from '@/hooks/useModal/useModal'
import { useRouteAccountId } from '@/hooks/useRouteAccountId/useRouteAccountId'
import { useRouteAssetId } from '@/hooks/useRouteAssetId/useRouteAssetId'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { selectWalletType } from '@/state/slices/localWalletSlice/selectors'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const mobileButtonRowDisplay = { base: 'flex', md: 'none' }
const desktopButtonGroupDisplay = { base: 'none', md: 'flex' }
const containerPadding = { base: 6, '2xl': 8 }
const containerGap = { base: 6, md: 6 }
const containerInnerFlexDir: ResponsiveValue<Property.FlexDirection> = {
  base: 'column',
  md: 'row',
}
const profileGridColumn = { base: 2, md: 1 }
const profileGridTemplate = { base: '1fr auto 1fr', md: '1fr 1fr' }
const balanceFontSize = '4xl'

const mobileButtonJustifyContent = { base: 'space-between', sm: 'center' }

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
const qrCodeIcon = (
  <Box>
    <FaExpand />
  </Box>
)

const mobileNetWorth = (
  // react-memo you're drunk, this is outside of component scope
  // eslint-disable-next-line react-memo/require-usememo
  <Flex alignItems='center' flexDir={containerInnerFlexDir} gap={4} gridColumn={profileGridColumn}>
    <WalletBalanceChange showErroredAccounts={false} />
  </Flex>
)

const desktopNetWorth = (
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
  return (
    <Button
      size='md'
      width='80px'
      height='80px'
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
  const mixpanel = getMixPanel()
  const translate = useTranslate()
  const {
    state: { isConnected: _isConnected },
  } = useWallet()
  const assetId = useRouteAssetId()
  const accountId = useRouteAccountId()
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
  const walletType = useAppSelector(selectWalletType)
  const isLedgerReadOnly = isLedgerReadOnlyEnabled && walletType === KeyManager.Ledger

  const isConnected = useMemo(
    () => _isConnected || isLedgerReadOnly,
    [_isConnected, isLedgerReadOnly],
  )

  const navigate = useNavigate()
  const send = useModal('send')
  const receive = useModal('receive')
  const fiatRamps = useModal('fiatRamps')
  const qrCode = useModal('qrCode')

  const handleQrCodeClick = useCallback(() => {
    vibrate('heavy')
    qrCode.open({})
  }, [qrCode])

  const handleSendClick = useCallback(() => {
    vibrate('heavy')
    mixpanel?.track(MixPanelEvent.SendClick)
    send.open({ assetId: asset?.assetId, accountId })
  }, [mixpanel, send, asset?.assetId, accountId])

  const handleReceiveClick = useCallback(() => {
    vibrate('heavy')
    receive.open({ asset, accountId })
  }, [receive, asset, accountId])

  const handleTradeClick = useCallback(() => {
    vibrate('heavy')
    navigate(TradeRoutePaths.Input)
  }, [navigate])

  const handleBuyClick = useCallback(() => {
    vibrate('heavy')
    fiatRamps.open({ assetId: undefined, fiatRampAction: FiatRampAction.Buy })
  }, [fiatRamps])

  const mobileButtons = useMemo(
    () => (
      <Flex
        mt={0}
        px={4}
        pb={6}
        width='100%'
        justifyContent={mobileButtonJustifyContent}
        gap={2}
        display={mobileButtonRowDisplay}
      >
        <MobileActionButton
          icon={swapIcon}
          label={translate('common.trade')}
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
          {translate('common.trade')}
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

  return (
    <>
      <Display.Mobile>
        <>
          <Container
            width='100%'
            display='grid'
            gridTemplateColumns={profileGridTemplate}
            px={containerPadding}
            pt={4}
            pb={4}
            gap={containerGap}
          >
            {mobileNetWorth}
            {desktopButtons}
          </Container>
          {mobileButtons}
        </>
      </Display.Mobile>
      <Display.Desktop>
        <Container
          width='full'
          display='grid'
          gridTemplateColumns={profileGridTemplate}
          pt={4}
          pb={4}
          alignItems='flex-start'
          justifyContent='space-between'
          gap={containerGap}
        >
          {desktopNetWorth}
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
