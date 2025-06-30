import type { TabProps } from '@chakra-ui/react'
import { Box, Container, Tab, TabIndicator, TabList, Tabs, useDisclosure } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
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

const mainPaddingBottom = { base: 16, md: 8 }

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

  const slideRenderer = useCallback((props: SlideRenderProps) => {
    const { index, key } = props
    let content
    const tab = mod(index, 2)
    switch (tab) {
      case HistoryTab.Activity:
        content = <ActionCenter />
        break
      case HistoryTab.History:
        content = <TransactionHistory />
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

  const mobileDrawer = useMemo(() => {
    if (isMobileApp) return <MobileWalletDialog isOpen={isOpen} onClose={onClose} />
    return <DashboardDrawer isOpen={isOpen} onClose={onClose} />
  }, [isOpen, onClose])

  const handleQrCodeclick = useCallback(() => qrCode.open({}), [qrCode])

  return (
    <Main pb={mainPaddingBottom} isSubPage>
      <SEO title={translate('history.heading')} />
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
      <Tabs index={slideIndex} onChange={handleSlideIndexChange} variant='unstyled' isLazy>
        <Box borderBottomWidth={1} borderColor='border.base'>
          <TabList px={4}>
            <CustomTab>{'Activity'}</CustomTab>
            <CustomTab>{'History'}</CustomTab>
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
