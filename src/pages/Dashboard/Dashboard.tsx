import type { FlexProps, TabProps } from '@chakra-ui/react'
import { Flex, Tab, TabIndicator, TabList, Tabs, useMediaQuery } from '@chakra-ui/react'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useHistory, useRouteMatch } from 'react-router'
import SwipeableViews from 'react-swipeable-views'
import { mod } from 'react-swipeable-views-core'
import type { SlideRenderProps } from 'react-swipeable-views-utils'
import { virtualize } from 'react-swipeable-views-utils'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { NftTable } from 'components/Nfts/NftTable'
import { RawText } from 'components/Text'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { isMobile } from 'lib/globals'
import { Accounts } from 'pages/Accounts/Accounts'
import { TransactionHistory } from 'pages/TransactionHistory/TransactionHistory'
import { breakpoints } from 'theme/theme'

import { DashboardHeader } from './components/DashboardHeader/DashboardHeader'
import { EarnDashboard } from './EarnDashboard'
import { MobileActivity } from './MobileActivity'
import { RewardsDashboard } from './RewardsDashboard'
import { WalletDashboard } from './WalletDashboard'

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
  Nfts,
  Activity,
}

export const Dashboard = memo(() => {
  const translate = useTranslate()
  const [slideIndex, setSlideIndex] = useState(0)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { path } = useRouteMatch()
  const isNftsEnabled = useFeatureFlag('Jaypegz')
  const appIsMobile = isMobile || !isLargerThanMd
  const history = useHistory()

  const handleSlideIndexChange = useCallback(
    (index: number) => {
      switch (index) {
        case MobileTab.Overview:
          history.push(`${path}`)
          break
        case MobileTab.Nfts:
          history.push(`${path}/nfts`)
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
          <CustomTab>NFTs</CustomTab>
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
      case MobileTab.Nfts:
        content = (
          <Route exact path={`${path}/nfts`}>
            <NftTable />
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
        <Route exact path={`${path}/rewards`}>
          <RewardsDashboard />
        </Route>
        <Route path={`${path}/accounts`}>
          <Accounts />
        </Route>
        <Route path={`${path}/activity`}>
          <TransactionHistory />
        </Route>
        {isNftsEnabled && (
          <Route exact path={`${path}/nfts`}>
            <NftTable />
          </Route>
        )}

        <Route>
          <RawText>Not found</RawText>
        </Route>
      </Switch>
    </Main>
  )
})
