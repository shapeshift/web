import type { FlexProps } from '@chakra-ui/react'
import { Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'

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

const walletDashboard = <WalletDashboard />
const earnDashboard = <EarnDashboard />
const accounts = <Accounts />
const transactionHistory = <TransactionHistory />
const notFound = <RawText>Not found</RawText>
const dashboardHeader = <DashboardHeader />

const ScrollView = (props: FlexProps) => (
  <Flex flexDir='column' width='100vw' pb='var(--mobile-nav-offset)' {...props} />
)

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
      if (location.pathname !== newPath) navigate(newPath, { replace: false })
    },
    [location.pathname, navigate, getPathFromTabIndex],
  )

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
          <Tab>{translate('dashboard.portfolio.myCrypto')}</Tab>
          <Tab>{translate('watchlist.title')}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel p={0} pt={2}>
            <Routes>
              <Route path='' element={walletDashboard} />
              <Route path='accounts/*' element={accounts} />
            </Routes>
          </TabPanel>
          <TabPanel p={0} pt={2}>
            <WatchlistTable />
          </TabPanel>
        </TabPanels>
      </Tabs>
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

  const mobileHome = useMemo(() => <MobileHome />, [])
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
        <ScrollView>
          <Main headerComponent={dashboardHeader} pt={0} pb={0} pageProps={pageProps}>
            <Routes>
              <Route path='*' element={mobileHome} />
              <Route path='earn' element={mobileEarn} />
            </Routes>
          </Main>
        </ScrollView>
      </Display.Mobile>
    </>
  )
})
