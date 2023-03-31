import { ChevronDownIcon } from '@chakra-ui/icons'
import type { FlexProps } from '@chakra-ui/react'
import {
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo, useState } from 'react'
import { FaDotCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { ChainOption } from 'components/ChainOption/ChainOption'
import { RawText } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { isSome } from 'lib/utils'
import {
  selectAssetById,
  selectAssets,
  selectFeeAssetByChainId,
  selectPortfolioChainIdsSortedFiat,
  selectPortfolioTotalFiatBalanceExcludeEarnDupes,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { GlobalFilter } from './GlobalFilter'
import type { PositionTableProps } from './PositionTable'
import { PositionTable } from './PositionTable'
import type { ProviderTableProps } from './ProviderTable'
import { ProviderTable } from './ProviderTable'

type DefiEarnProps = {
  positionTableProps?: Omit<PositionTableProps, 'searchQuery'>
  providerTableProps?: Omit<ProviderTableProps, 'searchQuery'>
  includeEarnBalances?: boolean
  includeRewardsBalances?: boolean
  header?: JSX.Element
} & FlexProps

type ChainFilterProps = {
  selectedChainId: ChainId | undefined
  setSelectedChainId: (chainId: ChainId | undefined) => void
}

const ChainFilter: React.FC<ChainFilterProps> = props => {
  const { selectedChainId, setSelectedChainId } = props

  const translate = useTranslate()
  const feeAssetId = useAppSelector(s => selectFeeAssetByChainId(s, selectedChainId ?? ''))
  const asset = useAppSelector(s => selectAssetById(s, feeAssetId?.assetId ?? ''))
  const assets = useAppSelector(selectAssets)
  const portfolioChainIds = useAppSelector(selectPortfolioChainIdsSortedFiat)
  const totalPortfolioFiatBalance = useAppSelector(selectPortfolioTotalFiatBalanceExcludeEarnDupes)

  const allNetworksRow = useMemo(
    () => (
      <MenuItemOption
        key={'allNetworks'}
        iconSpacing={0}
        onClick={() => setSelectedChainId(undefined)}
      >
        <Stack direction='row' spacing={0} ml={0}>
          <FaDotCircle />
          {/* // TODO(0xdef1cafe): translation */}
          <RawText fontWeight='bold'>{translate('All Chains')}</RawText>
          <Amount.Fiat value={totalPortfolioFiatBalance} />
        </Stack>
      </MenuItemOption>
    ),
    [setSelectedChainId, totalPortfolioFiatBalance, translate],
  )

  const menuOptions = useMemo(() => {
    const chainRows = portfolioChainIds
      .map(chainId => {
        const chainAdapter = getChainAdapterManager().get(chainId)
        if (!chainAdapter) return null
        const assetId = chainAdapter.getFeeAssetId()
        const asset = assets?.[assetId]
        if (!asset) return null
        const key = chainId
        const chainOptionsProps = { chainId, asset, setSelectedChainId, key }
        return <ChainOption {...chainOptionsProps} />
      })
      .filter(isSome)
    return [allNetworksRow, ...chainRows]
  }, [allNetworksRow, assets, portfolioChainIds, setSelectedChainId])

  const selectedOption = useMemo(() => {
    const assetRow = (
      <>
        <AssetIcon size='xs' assetId={asset?.assetId} showNetworkIcon mr={3} />
        <RawText fontWeight='bold'>{asset?.networkName ?? asset?.name}</RawText>
      </>
    )
    return asset ? assetRow : allNetworksRow
  }, [allNetworksRow, asset])

  return (
    <Menu>
      <MenuButton
        mb={4}
        as={Button}
        width='full'
        variant='outline'
        iconSpacing={0}
        rightIcon={<ChevronDownIcon />}
      >
        <Stack spacing={0} direction='row' alignItems='center'>
          {selectedOption}
        </Stack>
      </MenuButton>
      <MenuList>
        <MenuOptionGroup defaultValue='asc' type='radio'>
          {menuOptions}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  )
}

export const DeFiEarn: React.FC<DefiEarnProps> = ({
  positionTableProps,
  providerTableProps,
  includeEarnBalances,
  includeRewardsBalances,
  header,
  ...rest
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const translate = useTranslate()
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>()

  return (
    <Flex width='full' flexDir='column' gap={6}>
      {header && header}
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
          selected chain id {selectedChainId}
          <ChainFilter selectedChainId={selectedChainId} setSelectedChainId={setSelectedChainId} />
          <Flex flex={1} maxWidth={{ base: '100%', md: '300px' }} width='full'>
            <GlobalFilter setSearchQuery={setSearchQuery} searchQuery={searchQuery} />
          </Flex>
        </Flex>
        <TabPanels>
          <TabPanel>
            <PositionTable
              searchQuery={searchQuery}
              includeEarnBalances={Boolean(includeEarnBalances)}
              includeRewardsBalances={Boolean(includeRewardsBalances)}
            />
          </TabPanel>
          <TabPanel>
            <ProviderTable
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
