import type { FlexProps, TabProps } from '@chakra-ui/react'
import {
  Flex,
  Stack,
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useMediaQuery,
} from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Routes, useNavigate } from 'react-router-dom'
import SwipeableViews from 'react-swipeable-views'
import { mod } from 'react-swipeable-views-core'
import type { SlideRenderProps } from 'react-swipeable-views-utils'
import { virtualize } from 'react-swipeable-views-utils'

import { WatchlistTable } from '../Home/WatchlistTable'
import { DashboardHeader } from './components/DashboardHeader/DashboardHeader'
import { EarnDashboard } from './EarnDashboard'
import { MobileActivity } from './MobileActivity'
import { WalletDashboard } from './WalletDashboard'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { RawText } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { isMobile } from '@/lib/globals'
import { Accounts } from '@/pages/Accounts/Accounts'
import { WatchList } from '@/pages/Markets/Watchlist'
import { TransactionHistory } from '@/pages/TransactionHistory/TransactionHistory'
import { breakpoints } from '@/theme/theme'

const mainPadding = { base: 0, md: 4 }
const customTabActive = { color: 'text.base' }
const customTabLast = { marginRight: 0 }
const pageProps = { paddingTop: 0, pb: 0 }

const walletDashboard = <WalletDashboard />
const earnDashboard = <EarnDashboard />
const accounts = <Accounts />
const mobileActivity = <MobileActivity />
const transactionHistory = <TransactionHistory />
const notFound = <RawText>Not found</RawText>

const CustomTab = (props: TabProps) => (
  <Tab
    fontWeight='semibold'
    color='text.subtle'
    _selected={customTabActive}
    px={0}
    py={4}
    mr={6}
    _last={customTabLast}
    {...props}
  />
)

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

// Leverage the fact that enums don't exist in native JS and compile to 0, 1, and 2 when accessed here
// so we can have a declarative way to refer to the tab indexes instead of magic numbers
enum MobileTab {
  Overview,
  Earn,
  Activity,
}

export const Dashboard = memo(() => {
  const translate = useTranslate()
  const [slideIndex, setSlideIndex] = useState(0)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const appIsMobile = isMobile || !isLargerThanMd
  const navigate = useNavigate()

  const {
    dispatch: walletDispatch,
    state: { isLoadingLocalWallet, isConnected },
  } = useWallet()

  useEffect(() => {
    if (isLoadingLocalWallet) return
    if (isConnected) return

    walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [isLoadingLocalWallet, isConnected, walletDispatch])

  const handleSlideIndexChange = useCallback(
    (index: number) => {
      switch (index) {
        case MobileTab.Overview:
          navigate('')
          break
        case MobileTab.Earn:
          navigate('earn')
          break
        case MobileTab.Activity:
          navigate('activity')
          break
        default:
          break
      }

      setSlideIndex(index)
    },
    [navigate],
  )

  const mobileTabs = useMemo(() => {
    return (
      <Tabs
        mx={6}
        index={slideIndex}
        variant='soft-rounded'
        isLazy
        size='sm'
        onChange={handleSlideIndexChange}
      >
        <TabList bg='transparent' borderWidth={0}>
          <Tab>{translate('My Crypto')}</Tab>
          <Tab>{translate('Watchlist')}</Tab>
        </TabList>
      </Tabs>
    )
  }, [handleSlideIndexChange, slideIndex, translate])

  const dashboardHeader = useMemo(
    () => <DashboardHeader tabComponent={() => null} />,
    [appIsMobile, mobileTabs],
  )

  if (appIsMobile) {
    return (
      <Main headerComponent={dashboardHeader} pt={0} pb={0} pageProps={pageProps}>
        <ScrollView>
          <Tabs variant='soft-rounded' isLazy size='sm' pt={0}>
            <TabList bg='transparent' borderWidth={0} pt={0}>
              <Tab>{translate('My Crypto')}</Tab>
              <Tab>{translate('Watchlist')}</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0} py={0} pt={0}>
                <Routes>
                  <Route path='' element={walletDashboard} />
                  <Route path='accounts/*' element={accounts} />
                </Routes>
              </TabPanel>
              <TabPanel px={0} py={0}>
                <WatchlistTable />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ScrollView>
      </Main>
    )
  }

  return (
    <Main headerComponent={dashboardHeader} py={mainPadding}>
      <SEO title={translate('navBar.dashboard')} />
      <Routes>
        <Route path='*' element={walletDashboard} />
        <Route path='earn' element={earnDashboard} />
        <Route path='accounts/*' element={accounts} />
        <Route path='activity' element={transactionHistory} />
        <Route path='*' element={notFound} />
      </Routes>
    </Main>
  )
})
