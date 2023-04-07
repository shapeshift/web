import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Button, Container, Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import { getRenderedIdenticonBase64 } from '@shapeshiftoss/asset-service'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useEffect, useMemo, useRef } from 'react'
import { IoSwapVerticalSharp } from 'react-icons/io5'
import { useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { Text } from 'components/Text'
import {
  selectClaimableRewards,
  selectEarnBalancesFiatAmountFull,
  selectPortfolioTotalFiatBalanceExcludeEarnDupes,
  selectWalletId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { DashboardTab } from './DashboardTab'

export const DashboardHeader = () => {
  const walletId = useAppSelector(selectWalletId)
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
          {walletId && <LazyLoadAvatar borderRadius='xl' size='xl' src={walletImage} />}
          <Flex flexDir='column'>
            <Text fontWeight='semibold' translation='defi.netWorth' color='gray.500' />
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
