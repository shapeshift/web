import type { FlexProps } from '@chakra-ui/react'
import { Flex, Tab, TabList, Tabs } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import SwipeableViews from 'react-swipeable-views'
import { mod } from 'react-swipeable-views-core'
import type { SlideRenderProps } from 'react-swipeable-views-utils'
import { virtualize } from 'react-swipeable-views-utils'

import { WatchlistTable } from '../Home/WatchlistTable'
import { DashboardHeader } from './components/DashboardHeader/DashboardHeader'
import { EarnDashboard } from './EarnDashboard'
import { WalletDashboard } from './WalletDashboard'

import { Display } from '@/components/Display'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { RawText } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { Accounts } from '@/pages/Accounts/Accounts'
import { TransactionHistory } from '@/pages/TransactionHistory/TransactionHistory'

const mainPadding = { base: 0, md: 4 }
const pageProps = { paddingTop: 0, pb: 0 }
const customTabActive = { WebkitTapHighlightColor: 'transparent' }

const walletDashboard = <WalletDashboard />
const earnDashboard = <EarnDashboard />
const accounts = <Accounts />
const transactionHistory = <TransactionHistory />
const notFound = <RawText>Not found</RawText>
const dashboardHeader = <DashboardHeader />

const ScrollView = (props: FlexProps) => (
  <Flex
    flexDir='column'
    width='100vw'
    pt='calc(var(--mobile-header-offset) + 1rem)'
    pb='var(--mobile-nav-offset)'
    height='100dvh'
    overflowY='auto'
    {...props}
  />
)

const VirtualizedSwipableViews = virtualize(SwipeableViews)

// Leverage the fact that enums don't exist in native JS and compile to 0 and 1 when accessed here
// so we can have a declarative way to refer to the tab indexes instead of magic numbers
enum MobileTab {
  MyCrypto,
  Watchlist,
}

const getTabIndexFromPath = (pathname: string) => {
  if (pathname.endsWith('/watchlist')) return MobileTab.Watchlist
  return MobileTab.MyCrypto
}

const MobileHome = memo(() => {
  const translate = useTranslate()
  const location = useLocation()
  const navigate = useNavigate()

  const pathTabIndex = useMemo(() => getTabIndexFromPath(location.pathname), [location.pathname])

  const getPathFromTabIndex = useCallback((index: MobileTab) => {
    switch (index) {
      case MobileTab.Watchlist:
        return '/wallet/watchlist'
      case MobileTab.MyCrypto:
      default:
        return '/wallet'
    }
  }, [])

  const [activeTabIndex, setActiveTabIndex] = useState<MobileTab>(() => pathTabIndex)

  // Sync active tab to location pathname
  useEffect(() => {
    if (activeTabIndex === pathTabIndex) return

    setActiveTabIndex(pathTabIndex)
  }, [location.pathname, pathTabIndex, activeTabIndex])

  // And the other way too i.e sync browser route to the active tab
  const handleTabChange = useCallback(
    (index: MobileTab) => {
      setActiveTabIndex(index)
      const newPath = getPathFromTabIndex(index)
      if (location.pathname !== newPath) navigate(newPath, { replace: true })
    },
    [location.pathname, navigate, getPathFromTabIndex],
  )

  const slideRenderer = useCallback((props: SlideRenderProps) => {
    const { index, key } = props
    let content
    const tab = mod(index, 2)
    switch (tab) {
      case MobileTab.MyCrypto:
        content = (
          <Routes>
            <Route path='' element={walletDashboard} />
            <Route path='accounts/*' element={accounts} />
          </Routes>
        )
        break
      case MobileTab.Watchlist:
        content = <WatchlistTable />
        break
      default:
        content = null
        break
    }
    return (
      <div id={`scroll-view-${key}`} key={key}>
        {content}
      </div>
    )
  }, [])

  return (
    <>
      <Tabs
        index={activeTabIndex}
        onChange={handleTabChange}
        variant='soft-rounded'
        isLazy
        size='sm'
        pt={0}
        pb={2}
      >
        <TabList bg='transparent' borderWidth={0} pt={0} px={4} gap={2}>
          <Tab _active={customTabActive}>{translate('dashboard.portfolio.myCrypto')}</Tab>
          <Tab _active={customTabActive}>{translate('watchlist.title')}</Tab>
        </TabList>
      </Tabs>
      <VirtualizedSwipableViews
        index={activeTabIndex}
        onChangeIndex={handleTabChange}
        slideRenderer={slideRenderer}
        slideCount={2}
        overscanSlideBefore={1}
        overscanSlideAfter={1}
      />
    </>
  )
})

export const Dashboard = memo(() => {
  const translate = useTranslate()

  const {
    dispatch: walletDispatch,
    state: { isLoadingLocalWallet, isConnected },
  } = useWallet()

  useEffect(() => {
    if (isLoadingLocalWallet) return
    if (isConnected) return

    walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [isLoadingLocalWallet, isConnected, walletDispatch])

  const mobileHome = useMemo(
    () => (
      <ScrollView>
        <MobileHome />
      </ScrollView>
    ),
    [],
  )
  const mobileEarn = useMemo(() => <ScrollView>{earnDashboard}</ScrollView>, [])

  return (
    <>
      <SEO title={translate('navBar.dashboard')} />
      <Display.Desktop>
        <Main headerComponent={dashboardHeader} py={mainPadding}>
          <Routes>
            <Route path='*' element={walletDashboard} />
            <Route path='earn' element={earnDashboard} />
            <Route path='accounts/*' element={accounts} />
            <Route path='activity' element={transactionHistory} />
            <Route path='*' element={notFound} />
          </Routes>
        </Main>
      </Display.Desktop>
      <Display.Mobile>
        <Main headerComponent={dashboardHeader} pt={0} pb={0} pageProps={pageProps}>
          <Routes>
            <Route path='*' element={mobileHome} />
            <Route path='earn' element={mobileEarn} />
          </Routes>
        </Main>
      </Display.Mobile>
    </>
  )
})
