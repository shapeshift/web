import type { FlexProps, TabProps } from '@chakra-ui/react'
import {
  Box,
  Container,
  Flex,
  Tab,
  TabIndicator,
  TabList,
  Tabs,
  useDisclosure,
} from '@chakra-ui/react'
import { useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import SwipeableViews from 'react-swipeable-views'
import { mod } from 'react-swipeable-views-core'
import type { SlideRenderProps } from 'react-swipeable-views-utils'
import { virtualize } from 'react-swipeable-views-utils'

import { ActionCenter } from '@/components/Layout/Header/ActionCenter/ActionCenter'
import { GlobalSearchModal } from '@/components/Layout/Header/GlobalSearch/GlobalSearchModal'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { MobileWalletDialog } from '@/components/MobileWalletDialog/MobileWalletDialog'
import { useModal } from '@/hooks/useModal/useModal'
import { isMobile as isMobileApp } from '@/lib/globals'
import { DashboardDrawer } from '@/pages/Dashboard/components/DashboardHeader/DashboardDrawer'
import { MobileUserHeader } from '@/pages/Dashboard/components/DashboardHeader/MobileUserHeader'
import { TransactionHistory } from '@/pages/TransactionHistory/TransactionHistory'

const mainPaddingBottom = { base: 0, md: 8 }

const customTabActive = { color: 'text.base' }
const customTabLast = { marginRight: 0 }

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
    height='calc(100dvh - var(--mobile-history-header-offset) - var(--mobile-nav-offset) - 1rem - env(safe-area-inset-top) - var(--safe-area-inset-top))'
    overflowY='auto'
    {...props}
  />
)

const VirtualizedSwipableViews = virtualize(SwipeableViews)

enum HistoryTab {
  Activity,
  History,
}

export const History = () => {
  const translate = useTranslate()
  const [slideIndex, setSlideIndex] = useState(0)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isSearchOpen,
    onOpen: onSearchOpen,
    onClose: onSearchClose,
    onToggle: onSearchToggle,
  } = useDisclosure()
  const qrCode = useModal('qrCode')

  const handleSlideIndexChange = useCallback((index: number) => {
    setSlideIndex(index)
  }, [])

  useLayoutEffect(() => {
    const body = document.body
    const tabsHeader = document.querySelector('.history-tabs-header')
    const userHeader = document.querySelector('.mobile-user-header')
    if (window.visualViewport) {
      const vv = window.visualViewport
      const fixPosition = () => {
        if (body && tabsHeader && userHeader) {
          body.style.setProperty(
            '--mobile-history-header-offset',
            `${tabsHeader.clientHeight + userHeader.clientHeight}px`,
          )
        }
      }
      vv.addEventListener('resize', fixPosition)
      fixPosition()
      return () => {
        window.removeEventListener('resize', fixPosition)
      }
    }
  }, [])

  const slideRenderer = useCallback(
    (props: SlideRenderProps) => {
      const { index, key } = props
      let content
      const tab = mod(index, 2)
      if (slideIndex !== tab) return null

      switch (tab) {
        case HistoryTab.Activity:
          content = (
            <ScrollView>
              <ActionCenter />
            </ScrollView>
          )
          break
        case HistoryTab.History:
          content = (
            <ScrollView>
              <TransactionHistory />
            </ScrollView>
          )
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
    },
    [slideIndex],
  )

  const mobileDrawer = useMemo(() => {
    if (isMobileApp) return <MobileWalletDialog isOpen={isOpen} onClose={onClose} />
    return <DashboardDrawer isOpen={isOpen} onClose={onClose} />
  }, [isOpen, onClose])

  const handleQrCodeclick = useCallback(() => qrCode.open({}), [qrCode])

  return (
    <Main pb={mainPaddingBottom} pt={0}>
      <SEO title={translate('navBar.history')} />
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={onSearchClose}
        onOpen={onSearchOpen}
        onToggle={onSearchToggle}
      />
      {mobileDrawer}
      <Container px={6} pt={4}>
        <MobileUserHeader
          onSearchOpen={onSearchOpen}
          handleQrCodeClick={handleQrCodeclick}
          onOpen={onOpen}
        />
      </Container>
      <Tabs index={slideIndex} onChange={handleSlideIndexChange} variant='unstyled' pt={0} isLazy>
        <Box className='history-tabs-header' borderBottomWidth={1} borderColor='border.base'>
          <TabList px={4}>
            <CustomTab>{translate('common.activity')}</CustomTab>
            <CustomTab>{translate('navBar.history')}</CustomTab>
          </TabList>
          <TabIndicator height='2px' bg='blue.500' borderRadius='1px' />
        </Box>
        <VirtualizedSwipableViews
          index={slideIndex}
          onChangeIndex={handleSlideIndexChange}
          slideRenderer={slideRenderer}
          slideCount={2}
          overscanSlideBefore={1}
          overscanSlideAfter={1}
        />
      </Tabs>
    </Main>
  )
}
