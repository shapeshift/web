import type { ResponsiveValue } from '@chakra-ui/react'
import { Container, Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { useLocation } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import {
  selectClaimableRewards,
  selectTotalPortfolioBalanceIncludeStakingUserCurrency,
} from 'state/selectors'
import { useAppSelector } from 'state/store'

import { DashboardTab } from '../DashboardTab'
import { DashboardHeaderTop } from './DashboardHeaderTop'
import { DashboardHeaderWrapper } from './DashboardHeaderWrapper'
import { EarnBalance } from './EarnBalance'

const paddingTop = { base: 'env(safe-area-inset-top)', md: '4.5rem' }
const marginTop = { base: 0, md: '-4.5rem' }

export type TabItem = {
  label: string
  path: string
  color: string
  exact?: boolean
  rightElement?: JSX.Element
  hide?: boolean
}

const flexDirTabs: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const navItemPadding = { base: 6, '2xl': 8 }
const navCss = {
  '&::-webkit-scrollbar': {
    display: 'none',
  },
}

export const DashboardHeader = memo(({ tabComponent }: { tabComponent?: React.ReactNode }) => {
  const isNftsEnabled = useFeatureFlag('Jaypegz')
  const location = useLocation()
  const translate = useTranslate()
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const claimableRewardsUserCurrencyBalanceFilter = useMemo(() => ({}), [])
  const claimableRewardsUserCurrencyBalance = useAppSelector(state =>
    selectClaimableRewards(state, claimableRewardsUserCurrencyBalanceFilter),
  )
  const portfolioTotalUserCurrencyBalance = useAppSelector(
    selectTotalPortfolioBalanceIncludeStakingUserCurrency,
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
        rightElement: <EarnBalance />,
      },
      {
        label: 'navBar.rewards',
        path: '/wallet/rewards',
        color: 'green',
        rightElement: <Amount.Fiat value={claimableRewardsUserCurrencyBalance} />,
      },
      {
        label: 'dashboard.nfts',
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
    isNftsEnabled,
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

  const renderTabs = useMemo(() => {
    if (tabComponent) return tabComponent
    return (
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
    )
  }, [borderColor, renderNavItems, tabComponent])

  useLayoutEffect(() => {
    const body = document.body
    const header = document.querySelector('.dashboard-header')
    if (window.visualViewport) {
      const vv = window.visualViewport
      const fixPosition = () => {
        if (body && header) {
          body.style.setProperty('--mobile-header-offset', `${header.clientHeight}px`)
        }
      }
      vv.addEventListener('resize', fixPosition)
      fixPosition()
      return () => {
        window.removeEventListener('resize', fixPosition)
      }
    }
  }, [])

  return (
    <DashboardHeaderWrapper>
      <Stack
        spacing={0}
        borderColor='border.base'
        borderBottomWidth={1}
        pt={paddingTop}
        mt={marginTop}
      >
        <DashboardHeaderTop />
        {renderTabs}
      </Stack>
    </DashboardHeaderWrapper>
  )
})
