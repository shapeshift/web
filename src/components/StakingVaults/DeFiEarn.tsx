import type { FlexProps } from '@chakra-ui/react'
import { Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { GlobalFilter } from './GlobalFilter'
import type { PositionTableProps } from './PositionTable'
import { PositionTable } from './PositionTable'
import type { ProviderTableProps } from './ProviderTable'
import { ProviderTable } from './ProviderTable'

type DefiEarnProps = {
  positionTableProps?: Omit<PositionTableProps, 'searchQuery'>
  providerTableProps?: Omit<ProviderTableProps, 'searchQuery'>
} & FlexProps

export const DeFiEarn: React.FC<DefiEarnProps> = ({
  positionTableProps,
  providerTableProps,
  ...rest
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const translate = useTranslate()
  return (
    <Tabs isLazy variant='soft-rounded' size='sm'>
      <Flex
        justifyContent='space-between'
        alignItems='center'
        px={4}
        flexDir={{ base: 'column', md: 'row' }}
        gap={4}
        {...rest}
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
          <PositionTable searchQuery={searchQuery} {...positionTableProps} />
        </TabPanel>
        <TabPanel>
          <ProviderTable searchQuery={searchQuery} {...providerTableProps} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
}
