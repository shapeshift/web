import { Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { GlobalFilter } from './GlobalFilter'
import { PositionTable } from './PositionTable'
import { ProviderTable } from './ProviderTable'

export const DeFiEarn = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const translate = useTranslate()
  return (
    <Tabs isLazy variant='soft-rounded' size='sm'>
      <Flex
        justifyContent='space-between'
        alignItems='center'
        mt={6}
        px={4}
        flexDir={{ base: 'column', md: 'row' }}
        gap={4}
      >
        <TabList m={0}>
          <Tab>{translate('defi.byPosition')}</Tab>
          <Tab>{translate('defi.byProvider')}</Tab>
        </TabList>
        <Flex flex={1} maxWidth={{ base: '100%', md: '300px' }} width='full'>
          <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
        </Flex>
      </Flex>
      <TabPanels>
        <TabPanel>
          <PositionTable searchQuery={searchQuery} />
        </TabPanel>
        <TabPanel>
          <ProviderTable searchQuery={searchQuery} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
}
