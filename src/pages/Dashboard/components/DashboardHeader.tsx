import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Button, Container, Flex, Skeleton, Stack, useColorModeValue } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { IoSwapVerticalSharp } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { QRCodeIcon } from 'components/Icons/QRCode'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectClaimableRewards,
  selectEarnBalancesFiatAmountFull,
  selectPortfolioLoading,
  selectPortfolioTotalFiatBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DashboardTab } from './DashboardTab'
import { ProfileAvatar } from './ProfileAvatar/ProfileAvatar'

type TabItem = {
  label: string
  path: string
  color: string
  exact?: boolean
  rightElement?: JSX.Element
  hide?: boolean
}

export const DashboardHeader = () => {
  const isNftsEnabled = useFeatureFlag('Jaypegz')
  const location = useLocation()
  const { qrCode, send, receive } = useModal()
  const { history } = useBrowserRouter()
  const {
    state: { isConnected },
  } = useWallet()
  const translate = useTranslate()
  const loading = useAppSelector(selectPortfolioLoading)
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const claimableRewardsFiatBalanceFilter = useMemo(() => ({}), [])
  const claimableRewardsFiatBalance = useAppSelector(state =>
    selectClaimableRewards(state, claimableRewardsFiatBalanceFilter),
  )
  const earnFiatBalance = useAppSelector(selectEarnBalancesFiatAmountFull).toFixed()
  const portfolioTotalFiatBalance = useAppSelector(selectPortfolioTotalFiatBalanceExcludeEarnDupes)
  const netWorth = useMemo(
    () =>
      bnOrZero(earnFiatBalance)
        .plus(portfolioTotalFiatBalance)
        .plus(claimableRewardsFiatBalance)
        .toFixed(),
    [claimableRewardsFiatBalance, earnFiatBalance, portfolioTotalFiatBalance],
  )
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const bgColor = useColorModeValue('white', 'blackAlpha.100')

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [location])

  const NavItems: TabItem[] = useMemo(() => {
    return [
      {
        label: 'common.overview',
        path: '/dashboard',
        color: 'blue',
        exact: true,
      },
      {
        label: 'navBar.wallet',
        path: '/dashboard/accounts',
        color: 'blue',
        rightElement: <Amount.Fiat value={portfolioTotalFiatBalance} />,
      },
      {
        label: 'navBar.earn',
        path: '/dashboard/earn',
        color: 'purple',
        rightElement: <Amount.Fiat value={earnFiatBalance} />,
      },
      {
        label: 'navBar.rewards',
        path: '/dashboard/rewards',
        color: 'green',
        rightElement: <Amount.Fiat value={claimableRewardsFiatBalance} />,
      },
      {
        label: 'NFTs',
        path: '/dashboard/nfts',
        color: 'pink',
        rightElement: translate('common.new'),
        hide: !isNftsEnabled,
      },
      {
        label: 'navBar.activity',
        path: '/dashboard/activity',
        color: 'blue',
      },
    ]
  }, [
    claimableRewardsFiatBalance,
    earnFiatBalance,
    isNftsEnabled,
    portfolioTotalFiatBalance,
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

  return (
    <Stack spacing={0} borderColor={borderColor} bg={bgColor} pt='4.5rem' mt='-4.5rem'>
      <Container
        width='full'
        display='flex'
        maxWidth='container.4xl'
        px={{ base: 6, '2xl': 16 }}
        pt={8}
        pb={4}
        alignItems='center'
        justifyContent='space-between'
        gap={{ base: 4, md: 6 }}
        flexDir={{ base: 'column', xl: 'row' }}
      >
        <Flex alignItems='center' flexDir={{ base: 'column', md: 'row' }} gap={4}>
          <ProfileAvatar />
          <Flex flexDir='column' alignItems={{ base: 'center', md: 'flex-start' }}>
            <Text fontWeight='semibold' translation='defi.netWorth' color='gray.500' />
            <Skeleton isLoaded={!loading}>
              <Amount.Fiat lineHeight='shorter' value={netWorth} fontSize='4xl' fontWeight='bold' />
            </Skeleton>
          </Flex>
        </Flex>
        <Flex gap={4} flexWrap={'wrap'} justifyContent={'center'}>
          <Button isDisabled={!isConnected} onClick={handleQrCodeClick} leftIcon={<QRCodeIcon />}>
            {translate('modals.send.qrCode')}
          </Button>
          <Button isDisabled={!isConnected} onClick={handleSendClick} leftIcon={<ArrowUpIcon />}>
            {translate('common.send')}
          </Button>
          <Button
            isDisabled={!isConnected}
            onClick={handleReceiveClick}
            leftIcon={<ArrowDownIcon />}
          >
            {translate('common.receive')}
          </Button>
          <Button onClick={handleTradeClick} leftIcon={<IoSwapVerticalSharp />}>
            {translate('navBar.tradeShort')}
          </Button>
        </Flex>
      </Container>
      <Flex
        flexDir={{ base: 'column', md: 'row' }}
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
          px={{ base: 6, '2xl': 16 }}
          overflowY='auto'
          css={{
            '&::-webkit-scrollbar': {
              display: 'none',
            },
          }}
        >
          {renderNavItems}
        </Container>
      </Flex>
    </Stack>
  )
}
