import type { TabProps } from '@chakra-ui/react'
import {
  Box,
  Container,
  Tab,
  TabIndicator,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useDisclosure,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { ActionCenter } from '@/components/Layout/Header/ActionCenter/ActionCenter'
import { GlobalSearchModal } from '@/components/Layout/Header/GlobalSearch/GlobalSearchModal'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
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
  const mobileWalletDialog = useModal('mobileWalletDialog')

  const handleSlideIndexChange = useCallback((index: number) => {
    setSlideIndex(index)
  }, [])

  const mobileDrawer = useMemo(() => {
    if (isMobileApp) return null
    return <DashboardDrawer isOpen={isOpen} onClose={onClose} />
  }, [isOpen, onClose])

  const handleQrCodeclick = useCallback(() => qrCode.open({}), [qrCode])

  const handleUserHeaderClick = useCallback(() => {
    if (isMobileApp) return mobileWalletDialog.open({})
    onOpen()
  }, [mobileWalletDialog, onOpen])

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
      <Container px={4} pt={4}>
        <MobileUserHeader
          onSearchOpen={onSearchOpen}
          handleQrCodeClick={handleQrCodeclick}
          onOpen={handleUserHeaderClick}
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
        <TabPanels>
          <TabPanel p={0} pt={4}>
            <ActionCenter />
          </TabPanel>
          <TabPanel p={0} pt={4}>
            <TransactionHistory />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Main>
  )
}
