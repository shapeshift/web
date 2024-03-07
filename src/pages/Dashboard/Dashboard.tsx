import type { FlexProps, StackDirection, TabProps } from '@chakra-ui/react'
import { Flex, Stack, Tab, TabIndicator, TabList, Tabs, useMediaQuery } from '@chakra-ui/react'
import { memo, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Route, Switch, useRouteMatch } from 'react-router'
import SwipeableViews from 'react-swipeable-views'
import { mod } from 'react-swipeable-views-core'
import { type SlideRenderProps, virtualize } from 'react-swipeable-views-utils'
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
import { DashboardSidebar } from './DashboardSidebar'
import { EarnDashboard } from './EarnDashboard'
import { MobileActivity } from './MobileActivity'
import { Portfolio } from './Portfolio'
import { RewardsDashboard } from './RewardsDashboard'
import { WalletDashboard } from './WalletDashboard'

const direction: StackDirection = { base: 'column', xl: 'row' }
const maxWidth = { base: 'full', lg: 'full', xl: 'sm' }
const mainPadding = { base: 0, md: 4 }
const customTabActive = { color: 'text.base' }
const customTabLast = { marginRight: 0 }
const pageProps = { paddingTop: 0 }
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
    height='100vh'
    overflowY='auto'
    {...props}
  />
)

const VirtualizedSwipableViews = virtualize(SwipeableViews)

export const Dashboard = memo(() => {
  const translate = useTranslate()
  const [slideIndex, setSlideIndex] = useState(0)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const isDefiDashboardEnabled = useFeatureFlag('DefiDashboard')
  const { path } = useRouteMatch()
  const isNftsEnabled = useFeatureFlag('Jaypegz')
  const appIsMobile = isMobile || !isLargerThanMd

  const handleSlideChange = (index: number) => {
    setSlideIndex(index)
  }

  const mobileTabs = useMemo(() => {
    return (
      <Tabs mx={6} index={slideIndex} variant='unstyled' onChange={handleSlideChange}>
        <TabList>
          <CustomTab>{translate('navBar.overview')}</CustomTab>
          <CustomTab>NFTs</CustomTab>
          <CustomTab>{translate('navBar.activity')}</CustomTab>
        </TabList>
        <TabIndicator mt='-1.5px' height='2px' bg='blue.500' borderRadius='1px' />
      </Tabs>
    )
  }, [slideIndex, translate])

  const dashboardHeader = useMemo(
    () => <DashboardHeader tabComponent={appIsMobile && mobileTabs} />,
    [appIsMobile, mobileTabs],
  )

  const slideRenderer = (props: SlideRenderProps) => {
    const { index, key } = props
    let content
    switch (mod(index, 3)) {
      case 0:
        content = <WalletDashboard />
        break
      case 1:
        content = <NftTable />
        break
      case 2:
        content = <MobileActivity />
        break
      default:
        content = null
        break
    }
    return <ScrollView key={key}>{content}</ScrollView>
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
          onChangeIndex={handleSlideChange}
        />
      </Main>
    )
  }

  if (isDefiDashboardEnabled)
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

  return (
    <Main>
      <SEO title={translate('navBar.dashboard')} />
      <Stack alignItems='flex-start' spacing={4} mx='auto' direction={direction}>
        <Stack spacing={4} flex='1 1 0%' width='full'>
          <Portfolio />
        </Stack>
        <Stack flex='1 1 0%' width='full' maxWidth={maxWidth} spacing={4}>
          <DashboardSidebar />
        </Stack>
      </Stack>
    </Main>
  )
})
