import type { StackDirection, TabProps } from '@chakra-ui/react'
import { Stack, Tab, TabIndicator, TabList, TabPanel, TabPanels, Tabs, Box } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { Display } from '@/components/Display'
import { ActionCenter } from '@/components/Layout/Header/ActionCenter/ActionCenter'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { TransactionHistory } from '@/pages/TransactionHistory/TransactionHistory'

const maxWidth = { base: '100%', md: '450px' }
const mainPaddingBottom = { base: 16, md: 8 }

const HistoryHeader = () => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    navigate('/explore')
  }, [navigate])

  return (
    <>
      <PageHeader>
        <SEO title={translate('history.heading')} />
        <Display.Mobile>
          <PageHeader.Left>
            <PageBackButton onBack={handleBack} />
          </PageHeader.Left>
          <PageHeader.Middle>
            <PageHeader.Title>{translate('history.heading')}</PageHeader.Title>
          </PageHeader.Middle>
        </Display.Mobile>
      </PageHeader>
    </>
  )
}

const historyHeader = <HistoryHeader />

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
  return (
    <Main pb={mainPaddingBottom} headerComponent={historyHeader} isSubPage>
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
