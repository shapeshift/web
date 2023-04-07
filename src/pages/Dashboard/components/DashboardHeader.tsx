import { Container, Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { BoltIcon } from 'components/Icons/Bolt'
import { Text } from 'components/Text'
import {
  selectClaimableRewards,
  selectEarnBalancesFiatAmountFull,
  selectPortfolioTotalFiatBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DashboardTab } from './DashboardTab'

export const DashboardHeader = () => {
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
        path: '/dashboard/transaction-history',
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

  return (
    <Stack spacing={0} borderColor={borderColor}>
      <Container
        width='full'
        display='flex'
        maxWidth='container.xl'
        px={8}
        py={4}
        alignItems='center'
        gap={{ base: 2, md: 6 }}
        flexDir={{ base: 'column', md: 'row' }}
      >
        <Text translation='navBar.dashboard' fontSize='xl' fontWeight='medium' />
        <Flex alignItems='center' gap={4}>
          <Flex alignItems='center' gap={2}>
            <BoltIcon color='yellow.500' />
            <Text translation='defi.netWorth' color='gray.500' />
          </Flex>
          <Amount.Fiat value={netWorth} fontSize='xl' fontWeight='bold' />
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
