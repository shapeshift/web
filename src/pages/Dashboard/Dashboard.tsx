import type { FlexProps, TabProps } from '@chakra-ui/react'
import { Flex, Tab, TabIndicator, TabList, Tabs, useMediaQuery } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useHistory, useRouteMatch } from 'react-router-dom'
import SwipeableViews from 'react-swipeable-views'
import { mod } from 'react-swipeable-views-core'
import type { SlideRenderProps } from 'react-swipeable-views-utils'
import { virtualize } from 'react-swipeable-views-utils'

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
import { TransactionHistory } from '@/pages/TransactionHistory/TransactionHistory'
import { breakpoints } from '@/theme/theme'

const mainPadding = { base: 0, md: 4 }
const customTabActive = { color: 'text.base' }
const customTabLast = { marginRight: 0 }
const pageProps = { paddingTop: 0, pb: 0 }
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
  const { path } = useRouteMatch()
  const appIsMobile = isMobile || !isLargerThanMd
  const history = useHistory()

  const {
    dispatch: walletDispatch,
    state: { isConnected },
  } = useWallet()

  useEffect(() => {
    if (isConnected) return

    walletDispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [isConnected, walletDispatch])

  const handleSlideIndexChange = useCallback(
    (index: number) => {
      switch (index) {
        case MobileTab.Overview:
          history.push(`${path}`)
          break
        case MobileTab.Earn:
          history.push(`${path}/earn`)
          break
        case MobileTab.Activity:
          history.push(`${path}/activity`)
          break
        default:
          break
      }

      setSlideIndex(index)
    },
    [history, path],
  )

  const mobileTabs = useMemo(() => {
    return (
      <Tabs mx={6} index={slideIndex} variant='unstyled' onChange={handleSlideIndexChange}>
        <TabList>
          <CustomTab>{translate('navBar.overview')}</CustomTab>
          <CustomTab>{translate('defi.earn')}</CustomTab>
          <CustomTab>{translate('navBar.activity')}</CustomTab>
        </TabList>
        <TabIndicator mt='-1.5px' height='2px' bg='blue.500' borderRadius='1px' />
      </Tabs>
    )
  }, [handleSlideIndexChange, slideIndex, translate])

  const dashboardHeader = useMemo(
    () => <DashboardHeader tabComponent={appIsMobile ? mobileTabs : undefined} />,
    [appIsMobile, mobileTabs],
  )

  const slideRenderer = (props: SlideRenderProps) => {
    const { index, key } = props
    let content
    switch (mod(index, 3)) {
      case MobileTab.Overview:
        content = (
          <>
            <Route exact path={`${path}`}>
              <WalletDashboard />
            </Route>
            <Route path={`${path}/accounts`}>
              <Accounts />
            </Route>
          </>
        )
        break
      case MobileTab.Earn:
        content = (
          <Route exact path={`${path}/earn`}>
            <EarnDashboard />
          </Route>
        )
        break
      case MobileTab.Activity:
        content = <MobileActivity />
        break
      default:
        content = null
        break
    }
    return (
      <ScrollView id={`scroll-view-${key}`} key={key}>
        <Switch>{content}</Switch>
      </ScrollView>
    )
  }

  if (appIsMobile) {
    return (
      <Main headerComponent={dashboardHeader} pt={0} pb={0} pageProps={pageProps}>
        <VirtualizedSwipableViews
          index={slideIndex}
          slideRenderer={slideRenderer}
          slideCount={3}
          overscanSlideBefore={1}
          overscanSlideAfter={1}
          onChangeIndex={handleSlideIndexChange}
        />
      </Main>
    )
  }

  return (
    <Main headerComponent={dashboardHeader} py={mainPadding}>
      <SEO title={translate('navBar.dashboard')} />
      <Switch>
        <Route exact path={`${path}`}>
          <WalletDashboard />
        </Route>
        <Route exact path={`${path}/earn`}>
          <EarnDashboard />
        </Route>
        <Route path={`${path}/accounts`}>
          <Accounts />
        </Route>
        <Route path={`${path}/activity`}>
          <TransactionHistory />
        </Route>
        <Route>
          <RawText>Not found</RawText>
        </Route>
      </Switch>
    </Main>
  )
})
