import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Button, Container, Flex, Skeleton, Stack, useColorModeValue } from '@chakra-ui/react'
import { getRenderedIdenticonBase64 } from '@shapeshiftoss/asset-service'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { IoSwapVerticalSharp } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectClaimableRewards,
  selectEarnBalancesFiatAmountFull,
  selectPortfolioLoading,
  selectPortfolioTotalFiatBalanceExcludeEarnDupes,
  selectWalletId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DashboardTab } from './DashboardTab'

export const DashboardHeader = () => {
  const walletId = useAppSelector(selectWalletId)
  const location = useLocation()
  const { send, receive } = useModal()
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

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [location])

  const NavItems = useMemo(() => {
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
        fiatAmount: portfolioTotalFiatBalance,
      },
      {
        label: 'navBar.earn',
        path: '/dashboard/earn',
        color: 'purple',
        fiatAmount: earnFiatBalance,
      },
      {
        label: 'navBar.rewards',
        path: '/dashboard/rewards',
        color: 'green',
        fiatAmount: claimableRewardsFiatBalance,
      },
      {
        label: 'NFTs',
        path: '/dashboard/nfts',
        color: 'pink',
      },
      {
        label: 'navBar.activity',
        path: '/dashboard/activity',
        color: 'blue',
      },
    ]
  }, [claimableRewardsFiatBalance, earnFiatBalance, portfolioTotalFiatBalance])

  const renderNavItems = useMemo(() => {
    return NavItems.map(navItem => (
      <DashboardTab
        key={navItem.label}
        label={navItem.label}
        path={navItem.path}
        ref={location.pathname === navItem.path ? activeRef : null}
        color={navItem.color}
        fiatAmount={navItem.fiatAmount}
        exact={navItem.exact}
      />
    ))
  }, [NavItems, location.pathname])

  const walletImage = useMemo(() => {
    if (!walletId) return ''
    return getRenderedIdenticonBase64(`${walletId}ifyoudriveatruckdriveitlikeyouhaveafarm`)
  }, [walletId])

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
    <Stack spacing={0} borderColor={borderColor} bg='blackAlpha.100'>
      <Container
        width='full'
        display='flex'
        maxWidth='container.xl'
        px={8}
        pt={8}
        pb={4}
        alignItems='center'
        justifyContent='space-between'
        gap={{ base: 2, md: 6 }}
        flexDir={{ base: 'column', md: 'row' }}
      >
        <Flex alignItems='center' gap={4}>
          {walletId && <LazyLoadAvatar borderRadius='xl' size='xl' src={walletImage} />}
          <Flex flexDir='column'>
            <Text fontWeight='semibold' translation='defi.netWorth' color='gray.500' />
            <Skeleton isLoaded={!loading}>
              <Amount.Fiat lineHeight='shorter' value={netWorth} fontSize='4xl' fontWeight='bold' />
            </Skeleton>
          </Flex>
        </Flex>
        <Flex gap={4}>
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
            {translate('common.trade')}
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
          maxWidth='container.xl'
          className='navbar-scroller'
          display='flex'
          gap={8}
          px={8}
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
