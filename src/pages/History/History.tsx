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
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

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

export const History = () => {
  const translate = useTranslate()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isSearchOpen,
    onOpen: onSearchOpen,
    onClose: onSearchClose,
    onToggle: onSearchToggle,
  } = useDisclosure()
  const qrCode = useModal('qrCode')

  const mobileDrawer = useMemo(() => {
    if (isMobileApp) return <MobileWalletDialog isOpen={isOpen} onClose={onClose} />
    return <DashboardDrawer isOpen={isOpen} onClose={onClose} />
  }, [isOpen, onClose])

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
          handleQrCodeClick={() => qrCode.open({})}
          onOpen={onOpen}
        />
      </Container>
      <Tabs variant='unstyled' isLazy>
        <Box borderBottomWidth={1} borderColor='border.base'>
          <TabList px={4}>
            <CustomTab>{'Activity'}</CustomTab>
            <CustomTab>{'History'}</CustomTab>
          </TabList>
          <TabIndicator height='2px' bg='blue.500' borderRadius='1px' />
        </Box>
        <TabPanels width='100%'>
          <TabPanel px={0} py={0} width='100%'>
            <ActionCenter />
          </TabPanel>
          <TabPanel px={0} py={0} width='100%'>
            <TransactionHistory />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Main>
  )
}
