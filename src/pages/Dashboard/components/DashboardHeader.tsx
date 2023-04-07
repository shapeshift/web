import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Button, Container, Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import { getRenderedIdenticonBase64 } from '@shapeshiftoss/asset-service'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useEffect, useMemo, useRef } from 'react'
import { IoIosSwap } from 'react-icons/io'
import { IoSwapVerticalSharp } from 'react-icons/io5'
import { useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { BoltIcon } from 'components/Icons/Bolt'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import {
  selectClaimableRewards,
  selectEarnBalancesFiatAmountFull,
  selectPortfolioTotalFiatBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DashboardTab } from './DashboardTab'

export const DashboardHeader = () => {
  const {
    state: { walletInfo },
  } = useWallet()
  const location = useLocation()
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
        color: 'blue.500',
      },
      {
        label: 'navBar.wallet',
        path: '/dashboard/accounts',
        color: 'blue.500',
        fiatAmount: portfolioTotalFiatBalance,
      },
      {
        label: 'navBar.earn',
        path: '/dashboard/earn',
        color: 'purple.500',
        fiatAmount: earnFiatBalance,
      },
      {
        label: 'navBar.rewards',
        path: '/dashboard/rewards',
        color: 'green.500',
        fiatAmount: claimableRewardsFiatBalance,
      },
      {
        label: 'navBar.activity',
        path: '/dashboard/activity',
        color: 'blue.500',
      },
    ]
  }, [claimableRewardsFiatBalance, earnFiatBalance, portfolioTotalFiatBalance])

  const renderNavItems = useMemo(() => {
    return NavItems.map(navItem => (
      <DashboardTab
        label={navItem.label}
        path={navItem.path}
        ref={location.pathname === navItem.path ? activeRef : null}
        isActive={location.pathname === navItem.path}
        color={navItem.color}
        fiatAmount={navItem.fiatAmount}
      />
    ))
  }, [NavItems, location.pathname])

  const walletImage = useMemo(() => {
    if (!walletInfo) return ''
    return getRenderedIdenticonBase64(walletInfo.deviceId, 'bobdogcat')
  }, [walletInfo])

  return (
    <Stack spacing={0} borderColor={borderColor}>
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
          {walletInfo?.icon && <LazyLoadAvatar borderRadius={6} size='xl' src={walletImage} />}
          <Flex flexDir='column'>
            <MiddleEllipsis
              fontWeight='bold'
              fontSize='lg'
              lineHeight='shorter'
              value={walletInfo?.meta?.address ?? ''}
            />
            <Amount.Fiat lineHeight='shorter' value={netWorth} fontSize='4xl' fontWeight='bold' />
          </Flex>
        </Flex>
        <Flex gap={4}>
          <Button leftIcon={<ArrowUpIcon />}>Send</Button>
          <Button leftIcon={<ArrowDownIcon />}>Recieve</Button>
          <Button leftIcon={<IoSwapVerticalSharp />}>Trade</Button>
        </Flex>
      </Container>
      <Flex
        flexDir={{ base: 'column', md: 'row' }}
        borderBottomWidth={1}
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
