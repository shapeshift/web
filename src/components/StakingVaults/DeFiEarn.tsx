import type { FlexProps } from '@chakra-ui/react'
import { Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { ChainDropdown } from 'components/AssetSearch/Chains/ChainDropdown'
import { useQuery } from 'hooks/useQuery/useQuery'
import { selectPortfolioChainIdsSortedUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { GlobalFilter } from './GlobalFilter'
import type { PositionTableProps } from './PositionTable'
import { PositionTable } from './PositionTable'
import type { ProviderTableProps } from './ProviderTable'
import { WalletProviderTable } from './WalletProviderTable'

type DefiEarnProps = {
  positionTableProps?: Omit<PositionTableProps, 'searchQuery'>
  providerTableProps?: Omit<ProviderTableProps, 'searchQuery'>
  includeEarnBalances?: boolean
  includeRewardsBalances?: boolean
  header?: JSX.Element
} & FlexProps

export const DeFiEarn: React.FC<DefiEarnProps> = ({
  positionTableProps,
  providerTableProps,
  includeEarnBalances,
  includeRewardsBalances,
  header,
  ...rest
}) => {
  const { q } = useQuery<{ q?: string }>()
  const [searchQuery, setSearchQuery] = useState(q ?? '')
  const translate = useTranslate()
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>()
  const portfolioChainIds = useAppSelector(selectPortfolioChainIdsSortedUserCurrency)

  return (
    <Flex width='full' flexDir='column' gap={6}>
      {header && header}
      <Tabs isLazy lazyBehavior='keepMounted' variant='soft-rounded' size='sm'>
        <Flex
          justifyContent='space-between'
          alignItems='center'
          gap={4}
          flexWrap='wrap'
          flexDir={{ base: 'column', md: 'row' }}
          px={{ base: 4, xl: 0 }}
          {...rest}
        >
          <Flex flex={{ base: '1 0 auto', md: 1 }} width={{ base: 'full' }}>
            <TabList m={0} width={{ base: 'full', md: 'auto' }}>
              <Tab flex={{ base: 1, md: 'auto' }}>{translate('defi.byProvider')}</Tab>
              <Tab flex={{ base: 1, md: 'auto' }}>{translate('defi.byAsset')}</Tab>
            </TabList>
          </Flex>
          <ChainDropdown
            chainIds={portfolioChainIds}
            chainId={selectedChainId}
            onClick={setSelectedChainId}
            showAll
            includeBalance
          />
          <Flex flex={1} maxWidth={{ base: '100%', md: '300px' }} width='full' gap={4}>
            <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
          </Flex>
        </Flex>
        <TabPanels>
          <TabPanel px={0}>
            <WalletProviderTable
              chainId={selectedChainId}
              searchQuery={searchQuery}
              includeEarnBalances={Boolean(includeEarnBalances)}
              includeRewardsBalances={Boolean(includeRewardsBalances)}
            />
          </TabPanel>
          <TabPanel px={0}>
            <PositionTable
              chainId={selectedChainId}
              searchQuery={searchQuery}
              includeEarnBalances={Boolean(includeEarnBalances)}
              includeRewardsBalances={Boolean(includeRewardsBalances)}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Flex>
  )
}
