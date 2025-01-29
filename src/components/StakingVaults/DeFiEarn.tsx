import type { FlexProps, ResponsiveValue } from '@chakra-ui/react'
import { Flex, Tab, TabList, TabPanel, TabPanels, Tabs } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { knownChainIds } from 'constants/chains'
import type { Property } from 'csstype'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { useQuery } from 'hooks/useQuery/useQuery'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectWalletConnectedChainIdsSorted } from 'state/slices/selectors'
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

const flexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const flexPaddingX = { base: 4, xl: 0 }
const flexPropsMd1 = { base: '1 0 auto', md: 1 }
const flexPropsMdAuto = { base: 1, md: 'auto' }
const widthBaseFull = { base: 'full' }
const widthMdAuto = { base: 'full', md: 'auto' }
const globalFilterFlexMaxWidth = { base: '100%', md: '300px' }
const tabListPaddingLeft = { base: 6, md: 0 }

export const DeFiEarn: React.FC<DefiEarnProps> = ({
  positionTableProps,
  providerTableProps,
  includeEarnBalances,
  includeRewardsBalances,
  header,
  ...rest
}) => {
  const { isConnected } = useWallet().state
  const { q } = useQuery<{ q?: string }>()
  const [searchQuery, setSearchQuery] = useState(q ?? '')
  const translate = useTranslate()
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>()
  const chainIds = useAppSelector(state =>
    isConnected ? selectWalletConnectedChainIdsSorted(state) : knownChainIds,
  )

  return (
    <Flex width='full' flexDir='column' gap={6}>
      {header && header}
      <Tabs isLazy lazyBehavior='keepMounted' variant='soft-rounded' size='sm'>
        <Flex
          justifyContent='space-between'
          alignItems='center'
          gap={4}
          flexWrap='wrap'
          flexDir={flexDir}
          px={flexPaddingX}
          {...rest}
        >
          <Flex flex={flexPropsMd1} width={widthBaseFull}>
            <TabList m={0} width={widthMdAuto} pl={tabListPaddingLeft}>
              <Tab flex={flexPropsMdAuto} me={2}>
                {translate('defi.byProvider')}
              </Tab>
              <Tab flex={flexPropsMdAuto}>{translate('defi.byAsset')}</Tab>
            </TabList>
          </Flex>
          <ChainDropdown
            chainIds={chainIds}
            chainId={selectedChainId}
            onClick={setSelectedChainId}
            showAll
            includeBalance
          />
          <Flex flex={1} maxWidth={globalFilterFlexMaxWidth} width='full' gap={4}>
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
