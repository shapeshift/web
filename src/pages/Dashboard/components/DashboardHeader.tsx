import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Box,
  Button,
  Container,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  Flex,
  IconButton,
  Skeleton,
  Stack,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import type { Property } from 'csstype'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { IoEllipsisHorizontal, IoSwapVerticalSharp } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { QRCodeIcon } from 'components/Icons/QRCode'
import { SwapIcon } from 'components/Icons/SwapIcon'
import { SideNavContent } from 'components/Layout/Header/SideNavContent'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useProfileAvatar } from 'hooks/useProfileAvatar/useProfileAvatar'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectClaimableRewards,
  selectEarnBalancesUserCurrencyAmountFull,
  selectPortfolioLoading,
  selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DashboardTab } from './DashboardTab'
import { ProfileAvatar } from './ProfileAvatar/ProfileAvatar'

const paddingTop = { base: 'env(safe-area-inset-top)', md: '4.5rem' }
const marginTop = { base: 0, md: '-4.5rem' }

const moreIcon = <IoEllipsisHorizontal />

export type TabItem = {
  label: string
  path: string
  color: string
  exact?: boolean
  rightElement?: JSX.Element
  hide?: boolean
}

const IconButtonAfter = {
  content: 'attr(aria-label)',
  position: 'absolute',
  bottom: '-1.5rem',
  fontSize: '12px',
  overflow: 'hidden',
  width: '100%',
  textOverflow: 'ellipsis',
  color: 'text.base',
}

const qrCodeIcon = <QRCodeIcon />
const arrowUpIcon = <ArrowUpIcon />
const arrowDownIcon = <ArrowDownIcon />
const ioSwapVerticalSharpIcon = <IoSwapVerticalSharp />
const swapIcon = <SwapIcon />

const ButtonRowDisplay = { base: 'none', md: 'none' }

const flexDirTabs: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const containerPadding = { base: 6, '2xl': 8 }
const containerGap = { base: 6, md: 6 }
const containerFlexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', xl: 'row' }
const containerInnerFlexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const portfolioTextAlignment: ResponsiveValue<Property.AlignItems> = {
  base: 'center',
  md: 'flex-start',
}
const buttonGroupDisplay = { base: 'none', md: 'flex' }
const navItemPadding = { base: 6, '2xl': 8 }
const navCss = {
  '&::-webkit-scrollbar': {
    display: 'none',
  },
}

const balanceFontSize = { base: '2xl', md: '4xl' }
const balanceFlexDir: ResponsiveValue<Property.FlexDirection> = {
  base: 'column-reverse',
  md: 'column',
}

export const DashboardHeader = ({
  isOpportunitiesLoading,
}: {
  isOpportunitiesLoading: boolean
}) => {
  const { isOpen, onClose, onOpen } = useDisclosure()
  const isNftsEnabled = useFeatureFlag('Jaypegz')
  const location = useLocation()
  const send = useModal('send')
  const receive = useModal('receive')
  const qrCode = useModal('qrCode')
  const avatarImage = useProfileAvatar()
  const { history } = useBrowserRouter()
  const {
    state: { isConnected },
  } = useWallet()
  const translate = useTranslate()
  const isPortfolioLoading = useAppSelector(selectPortfolioLoading)
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const claimableRewardsUserCurrencyBalanceFilter = useMemo(() => ({}), [])
  const claimableRewardsUserCurrencyBalance = useAppSelector(state =>
    selectClaimableRewards(state, claimableRewardsUserCurrencyBalanceFilter),
  )
  const earnUserCurrencyBalance = useAppSelector(selectEarnBalancesUserCurrencyAmountFull).toFixed()
  const portfolioTotalUserCurrencyBalance = useAppSelector(
    selectPortfolioTotalUserCurrencyBalanceExcludeEarnDupes,
  )
  const netWorth = useMemo(
    () =>
      bnOrZero(earnUserCurrencyBalance)
        .plus(portfolioTotalUserCurrencyBalance)
        .plus(claimableRewardsUserCurrencyBalance)
        .toFixed(),
    [
      claimableRewardsUserCurrencyBalance,
      earnUserCurrencyBalance,
      portfolioTotalUserCurrencyBalance,
    ],
  )
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.200')

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [location])

  const NavItems: TabItem[] = useMemo(() => {
    return [
      {
        label: 'common.overview',
        path: '/wallet',
        color: 'blue',
        exact: true,
      },
      {
        label: 'navBar.wallet',
        path: '/wallet/accounts',
        color: 'blue',
        rightElement: <Amount.Fiat value={portfolioTotalUserCurrencyBalance} />,
      },
      {
        label: 'navBar.defi',
        path: '/wallet/earn',
        color: 'purple',
        rightElement: (
          <Skeleton isLoaded={!isOpportunitiesLoading}>
            <Amount.Fiat value={earnUserCurrencyBalance} />
          </Skeleton>
        ),
      },
      {
        label: 'navBar.rewards',
        path: '/wallet/rewards',
        color: 'green',
        rightElement: <Amount.Fiat value={claimableRewardsUserCurrencyBalance} />,
      },
      {
        label: 'NFTs',
        path: '/wallet/nfts',
        color: 'pink',
        rightElement: translate('common.new'),
        hide: !isNftsEnabled,
      },
      {
        label: 'navBar.activity',
        path: '/wallet/activity',
        color: 'blue',
      },
    ]
  }, [
    claimableRewardsUserCurrencyBalance,
    earnUserCurrencyBalance,
    isNftsEnabled,
    isOpportunitiesLoading,
    portfolioTotalUserCurrencyBalance,
    translate,
  ])

  const renderNavItems = useMemo(() => {
    return NavItems.filter(item => !item.hide).map(navItem => (
      <DashboardTab
        key={navItem.label}
        label={navItem.label}
        path={navItem.path}
        ref={location.pathname === navItem.path ? activeRef : null}
        color={navItem.color}
        rightElement={navItem.rightElement}
        exact={navItem.exact}
      />
    ))
  }, [NavItems, location.pathname])

  const handleQrCodeClick = useCallback(() => {
    qrCode.open({})
  }, [qrCode])

  const handleSendClick = useCallback(() => {
    send.open({})
  }, [send])

  const handleReceiveClick = useCallback(() => {
    receive.open({})
  }, [receive])

  const handleTradeClick = useCallback(() => {
    history.push('/trade')
  }, [history])

  const headerAfter = useMemo(() => {
    return {
      content: '""',
      bgImage: avatarImage,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      position: 'absolute',
      left: 0,
      right: 0,
      height: '100px',
      top: 0,
      zIndex: -1,
    }
  }, [avatarImage])

  return (
    <Box position='sticky' top={0} zIndex='sticky' _after={headerAfter}>
      <Stack
        spacing={0}
        borderColor='border.base'
        bg='background.surface.alpha'
        borderBottomWidth={1}
        pt={paddingTop}
        mt={marginTop}
        backdropFilter='blur(30px)'
      >
        <Container
          width='full'
          display='grid'
          gridTemplateColumns='1fr 1fr 1fr'
          maxWidth='container.4xl'
          px={containerPadding}
          pt={4}
          pb={4}
          alignItems='flex-start'
          justifyContent='space-between'
          gap={containerGap}
          flexDir={containerFlexDir}
        >
          <Flex alignItems='center' flexDir={containerInnerFlexDir} gap={4} gridColumn={2}>
            <ProfileAvatar />
            <Flex flexDir={balanceFlexDir} alignItems={portfolioTextAlignment}>
              <Text fontWeight='medium' translation='defi.netWorth' color='text.subtle' />
              <Skeleton isLoaded={!isPortfolioLoading && !isOpportunitiesLoading}>
                <Amount.Fiat
                  lineHeight='shorter'
                  value={netWorth}
                  fontSize={balanceFontSize}
                  fontWeight='semibold'
                />
              </Skeleton>
            </Flex>
          </Flex>
          <Flex gap={4} flexWrap={'wrap'} justifyContent={'center'} display={buttonGroupDisplay}>
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
          <Flex justifyContent='flex-end' alignItems='flex-start' gridColumn={3}>
            <IconButton isRound icon={moreIcon} aria-label='Settings' onClick={onOpen} />
          </Flex>
          <Flex width='full' display={ButtonRowDisplay}>
            <Flex flex={1} alignItems='center' justifyContent='center' mb={6}>
              <IconButton
                icon={arrowUpIcon}
                size='lg'
                isRound
                aria-label={translate('common.send')}
                _after={IconButtonAfter}
                onClick={handleSendClick}
                isDisabled={!isConnected}
                colorScheme='blue'
              />
            </Flex>
            <Flex flex={1} alignItems='center' justifyContent='center' mb={6}>
              <IconButton
                icon={arrowDownIcon}
                size='lg'
                isRound
                aria-label={translate('common.receive')}
                _after={IconButtonAfter}
                onClick={handleReceiveClick}
                isDisabled={!isConnected}
                colorScheme='blue'
              />
            </Flex>
            <Flex flex={1} alignItems='center' justifyContent='center' mb={6}>
              <IconButton
                icon={swapIcon}
                size='lg'
                isRound
                aria-label={translate('navBar.tradeShort')}
                _after={IconButtonAfter}
                onClick={handleTradeClick}
                colorScheme='blue'
              />
            </Flex>
            <Flex flex={1} alignItems='center' justifyContent='center' mb={6}>
              <IconButton
                icon={qrCodeIcon}
                size='lg'
                isRound
                aria-label={translate('modals.send.qrCode')}
                _after={IconButtonAfter}
                onClick={handleQrCodeClick}
                isDisabled={!isConnected}
                colorScheme='blue'
              />
            </Flex>
          </Flex>
        </Container>
        <Flex
          flexDir={flexDirTabs}
          borderBottomWidth={0}
          borderColor={borderColor}
          marginBottom='-1px'
          gap={8}
          position='sticky'
          top='72px'
        >
          <Container
            ref={containerRef}
            maxWidth='container.4xl'
            className='navbar-scroller'
            display='flex'
            gap={8}
            px={navItemPadding}
            overflowY='auto'
            css={navCss}
          >
            {renderNavItems}
          </Container>
        </Flex>
      </Stack>
      <Drawer isOpen={isOpen} onClose={onClose} placement='left'>
        <DrawerOverlay />
        <DrawerContent
          paddingTop='env(safe-area-inset-top)'
          paddingBottom='max(1rem, env(safe-area-inset-top))'
          overflowY='auto'
        >
          <SideNavContent onClose={onClose} />
        </DrawerContent>
      </Drawer>
    </Box>
  )
}
