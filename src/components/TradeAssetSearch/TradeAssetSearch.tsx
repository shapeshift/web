import { ChevronDownIcon, SearchIcon } from '@chakra-ui/icons'
import type { BoxProps, InputProps } from '@chakra-ui/react'
import {
  Box,
  Center,
  Flex,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { matchSorter } from 'match-sorter'
import type { FC, FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { FaRegCompass } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'
import type { TopItemListProps } from 'react-virtuoso'
import { Virtuoso } from 'react-virtuoso'

import { CustomAssetAcknowledgement } from './components/CustomAssetAcknowledgement'
import { DefaultAssetList } from './components/DefaultAssetList'
import { SearchTermAssetList } from './components/SearchTermAssetList'
import { useAssetSearchWorker } from './hooks/useAssetSearchWorker'
import { useGetPopularAssetsQuery } from './hooks/useGetPopularAssetsQuery'

import { INCREASE_VIEWPORT_BY } from '@/components/AssetSearch/components/AssetList'
import { AssetMenuButton } from '@/components/AssetSelection/components/AssetMenuButton'
import { AllChainMenu } from '@/components/ChainMenu'
import { Text } from '@/components/Text'
import { FiatRow } from '@/components/TradeAssetSearch/components/FiatRow'
import { knownChainIds } from '@/constants/chains'
import type { FiatTypeEnumWithoutCryptos } from '@/constants/fiats'
import { FIATS } from '@/constants/fiats'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { sortChainIdsByDisplayName } from '@/lib/utils'
import {
  selectPortfolioPrimaryAssetsByChain,
  selectPortfolioTotalUserCurrencyBalance,
  selectPrimaryAssetsByChain,
  selectWalletConnectedChainIds,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const buttonProps = {
  rightIcon: <ChevronDownIcon />,
}

const assetButtonProps = {
  justifyContent: 'flex-end',
  pl: 1.5,
  pr: 3,
  py: 1.5,
  size: 'sm',
  borderRadius: '2xl',
  height: 'auto',
}
const style = { minHeight: 'calc(50vh + 40px)' }

const textSelectedProps = {
  color: 'text.base',
}

const NUM_QUICK_ACCESS_ASSETS = 6

export type TradeAssetSearchProps = {
  onAssetClick?: (asset: Asset) => void
  onFiatClick?: (fiat: FiatTypeEnumWithoutCryptos) => void
  formProps?: BoxProps
  allowWalletUnsupportedAssets?: boolean
  assetFilterPredicate?: (assetId: AssetId) => boolean
  chainIdFilterPredicate?: (chainId: ChainId) => boolean
  selectedChainId?: ChainId | 'All'
  onSelectedChainIdChange?: (chainId: ChainId | 'All') => void
  showFiatTab?: boolean
  showAssetTab?: boolean
}

const Footer = () => <Box height='0.5rem' />
const TopItemList = ({ children }: TopItemListProps) => <div>{children}</div>
const components = { TopItemList, Footer }

export const TradeAssetSearch: FC<TradeAssetSearchProps> = ({
  onAssetClick,
  onFiatClick,
  formProps,
  allowWalletUnsupportedAssets,
  assetFilterPredicate,
  chainIdFilterPredicate,
  selectedChainId = 'All',
  onSelectedChainIdChange,
  showFiatTab = false,
  showAssetTab = true,
}) => {
  const { walletInfo } = useWallet().state
  const hasWallet = useMemo(() => Boolean(walletInfo?.deviceId), [walletInfo?.deviceId])
  const translate = useTranslate()
  const navigate = useNavigate()
  const [activeChainId, setActiveChainId] = useState<ChainId | 'All'>(selectedChainId)
  const [assetToImport, setAssetToImport] = useState<Asset | undefined>(undefined)
  const [shouldShowWarningAcknowledgement, setShouldShowWarningAcknowledgement] = useState(false)
  const isSwapperFiatRampsEnabled = useFeatureFlag('SwapperFiatRamps')

  const portfolioTotalUserCurrencyBalance = useAppSelector(selectPortfolioTotalUserCurrencyBalance)

  const portfolioAssetsSortedByBalance = useAppSelector(
    // When no wallet is connected, there is no portfolio, hence we display all Assets
    // If a wallet is connected with zero balances everywhere, we do the same
    // Since 0-balances are not reflected in selectPortfolioUserCurrencyBalances/selectPortfolioFungibleAssetsSortedByBalance/
    state =>
      hasWallet && bnOrZero(portfolioTotalUserCurrencyBalance).gt(0)
        ? selectPortfolioPrimaryAssetsByChain(state, activeChainId)
        : selectPrimaryAssetsByChain(state, activeChainId),
  )
  const walletConnectedChainIds = useAppSelector(selectWalletConnectedChainIds)

  const { data: popularAssetsByChainId, isLoading: isPopularAssetIdsLoading } =
    useGetPopularAssetsQuery()

  // If a custom click handler isn't provided navigate to the asset's page
  const defaultClickHandler = useCallback(
    (asset: Asset) => {
      // AssetId has a `/` separator so the router will have to parse 2 variables
      // e.g., /assets/:chainId/:assetSubId
      const url = `/assets/${asset.assetId}`
      navigate(url)
    },
    [navigate],
  )
  const handleAssetClick = onAssetClick ?? defaultClickHandler

  const assetWorkerParams = useMemo(
    () => ({
      activeChainId,
      allowWalletUnsupportedAssets,
      walletConnectedChainIds,
      hasWallet,
    }),
    [activeChainId, allowWalletUnsupportedAssets, hasWallet, walletConnectedChainIds],
  )

  // Asset search worker hook
  const { searchString, workerSearchState, handleSearchChange } =
    useAssetSearchWorker(assetWorkerParams)

  const isSearching = useMemo(() => searchString.length > 0, [searchString])

  const handleSubmit = useCallback((e: FormEvent<unknown>) => e.preventDefault(), [])

  const handleSelectedChainIdChange = useCallback(
    (chainId: ChainId | 'All') => {
      setActiveChainId(chainId)
      onSelectedChainIdChange?.(chainId)
    },
    [onSelectedChainIdChange],
  )

  const popularAssets = useMemo(() => {
    const unfilteredPopularAssets = popularAssetsByChainId?.[activeChainId] ?? []
    const filteredPopularAssets = unfilteredPopularAssets.filter(
      asset => assetFilterPredicate?.(asset.assetId) ?? true,
    )
    if (allowWalletUnsupportedAssets || !hasWallet) return filteredPopularAssets

    // TODO: move `allowWalletUnsupportedAssets` into `assetFilterPredicate`
    return filteredPopularAssets.filter(asset => walletConnectedChainIds.includes(asset.chainId))
  }, [
    popularAssetsByChainId,
    activeChainId,
    allowWalletUnsupportedAssets,
    hasWallet,
    walletConnectedChainIds,
    assetFilterPredicate,
  ])

  const quickAccessAssets = useMemo(() => {
    if (activeChainId !== 'All') {
      return popularAssets.slice(0, 6)
    }

    // if we selected 'All' chains, we'll dedupe EVM assets in favor of ethereum mainnet
    const resultMap: Record<AssetId, Asset> = {}
    for (const asset of popularAssets) {
      if (Object.keys(resultMap).length === NUM_QUICK_ACCESS_ASSETS) {
        break
      }

      const key = asset.relatedAssetKey ?? asset.assetId

      // set first occurrence, overwrite if eth mainnet
      if (resultMap[key] === undefined || asset.chainId === KnownChainIds.EthereumMainnet) {
        resultMap[key] = asset
      }
    }

    return Object.values(resultMap)
  }, [activeChainId, popularAssets])

  const portfolioAssetsSortedByBalanceForChain = useMemo(() => {
    const filteredPortfolioAssetsSortedByBalance = portfolioAssetsSortedByBalance.filter(
      asset => assetFilterPredicate?.(asset.assetId) ?? true,
    )

    return filteredPortfolioAssetsSortedByBalance
  }, [portfolioAssetsSortedByBalance, assetFilterPredicate])

  const chainIds: (ChainId | 'All')[] = useMemo(() => {
    const unsortedChainIds = (() => {
      if (allowWalletUnsupportedAssets || !hasWallet) {
        return knownChainIds
      }

      return walletConnectedChainIds
    })()

    const sortedChainIds = sortChainIdsByDisplayName(unsortedChainIds).filter(
      chainId => chainIdFilterPredicate?.(chainId) ?? true,
    )

    return ['All', ...sortedChainIds]
  }, [allowWalletUnsupportedAssets, hasWallet, walletConnectedChainIds, chainIdFilterPredicate])

  const quickAccessAssetButtons = useMemo(() => {
    if (isPopularAssetIdsLoading) {
      return Array(NUM_QUICK_ACCESS_ASSETS)
        .fill(null)
        .map((_, i) => {
          return <AssetMenuButton key={i} isLoading isDisabled buttonProps={assetButtonProps} />
        })
    }

    return quickAccessAssets.map(({ assetId }) => {
      return (
        <AssetMenuButton
          key={assetId}
          assetId={assetId}
          onAssetClick={handleAssetClick}
          buttonProps={assetButtonProps}
          isLoading={isPopularAssetIdsLoading}
          isDisabled={false}
          showNetworkIcon
        />
      )
    })
  }, [handleAssetClick, isPopularAssetIdsLoading, quickAccessAssets])

  const handleImportIntent = useCallback((asset: Asset) => {
    setAssetToImport(asset)
    setShouldShowWarningAcknowledgement(true)
  }, [])

  const inputProps: InputProps = useMemo(
    () => ({
      value: searchString,
      onChange: handleSearchChange,
      autoFocus: !window.matchMedia('(pointer: coarse)').matches, // Don't auto bust open the keyboard on mobile
      type: 'text',
      placeholder: translate('common.searchNameOrAddress'),
      pl: 10,
      variant: 'filled',
      borderWidth: 0,
      autoComplete: 'off',
    }),
    [searchString, handleSearchChange, translate],
  )

  const searchFiats = useMemo(() => {
    return matchSorter(FIATS, searchString, {
      threshold: matchSorter.rankings.CONTAINS,
    })
  }, [searchString])

  const handleFiatClick = useCallback(
    (fiat: FiatTypeEnumWithoutCryptos) => {
      onFiatClick?.(fiat)
    },
    [onFiatClick],
  )

  const renferFiatItem = useCallback(
    (index: number) => {
      const fiat = searchFiats[index]
      return <FiatRow key={fiat} fiat={fiat} onClick={handleFiatClick} />
    },
    [handleFiatClick, searchFiats],
  )

  const listContent = useMemo(() => {
    if (isSwapperFiatRampsEnabled && !showAssetTab && showFiatTab) {
      return (
        <Box p={4}>
          <Text translation='common.fiat' mb={2} />
          {searchFiats.length > 0 ? (
            <Virtuoso
              className='scroll-container'
              data={searchFiats}
              itemContent={renferFiatItem}
              style={style}
              overscan={1000}
              increaseViewportBy={INCREASE_VIEWPORT_BY}
              components={components}
            />
          ) : (
            <Center flexDir='column' gap={2} mt={4} minH='calc(50vh + 24px)'>
              <Icon as={FaRegCompass} boxSize='24px' color='text.subtle' />
              <Text color='text.subtle' translation='common.noResultsFound' />
            </Center>
          )}
        </Box>
      )
    }

    if (isSwapperFiatRampsEnabled && showFiatTab) {
      return (
        <Tabs variant='unstyled' display='flex' flexDirection='column' height='100%' isLazy>
          <TabList gap={4} flex='0 0 auto' px={4} pt={4}>
            <Tab
              p={0}
              fontSize='md'
              fontWeight='bold'
              color='text.subtle'
              _selected={textSelectedProps}
            >
              <Text translation='common.crypto' />
            </Tab>
            <Tab
              p={0}
              fontSize='md'
              fontWeight='bold'
              color='text.subtle'
              _selected={textSelectedProps}
            >
              <Text translation='common.fiat' />
            </Tab>
          </TabList>
          <TabPanels height='100%' px={0}>
            <TabPanel px={0} py={0} height='100%'>
              {isSearching ? (
                <SearchTermAssetList
                  activeChainId={activeChainId}
                  searchString={searchString}
                  onAssetClick={handleAssetClick}
                  onImportClick={handleImportIntent}
                  isLoading={isPopularAssetIdsLoading}
                  assetFilterPredicate={assetFilterPredicate}
                  allowWalletUnsupportedAssets={!hasWallet || allowWalletUnsupportedAssets}
                  workerSearchState={workerSearchState}
                />
              ) : (
                <DefaultAssetList
                  portfolioAssetsSortedByBalance={portfolioAssetsSortedByBalanceForChain}
                  popularAssets={popularAssets}
                  onAssetClick={handleAssetClick}
                  activeChainId={activeChainId}
                />
              )}
            </TabPanel>

            <TabPanel px={2} py={0} height='100%' pt={2}>
              {searchFiats.length > 0 ? (
                <Virtuoso
                  className='scroll-container'
                  data={searchFiats}
                  itemContent={renferFiatItem}
                  style={style}
                  overscan={1000}
                  increaseViewportBy={INCREASE_VIEWPORT_BY}
                  components={components}
                />
              ) : (
                <Center flexDir='column' gap={2} mt={4} minH='calc(50vh + 24px)'>
                  <Icon as={FaRegCompass} boxSize='24px' color='text.subtle' />
                  <Text color='text.subtle' translation='common.noResultsFound' />
                </Center>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      )
    }

    if (isSearching) {
      return (
        <SearchTermAssetList
          activeChainId={activeChainId}
          searchString={searchString}
          onAssetClick={handleAssetClick}
          onImportClick={handleImportIntent}
          isLoading={isPopularAssetIdsLoading}
          assetFilterPredicate={assetFilterPredicate}
          allowWalletUnsupportedAssets={!hasWallet || allowWalletUnsupportedAssets}
          workerSearchState={workerSearchState}
        />
      )
    }

    return (
      <DefaultAssetList
        portfolioAssetsSortedByBalance={portfolioAssetsSortedByBalanceForChain}
        popularAssets={popularAssets}
        onAssetClick={handleAssetClick}
        activeChainId={activeChainId}
      />
    )
  }, [
    activeChainId,
    allowWalletUnsupportedAssets,
    assetFilterPredicate,
    handleAssetClick,
    handleImportIntent,
    hasWallet,
    isPopularAssetIdsLoading,
    isSearching,
    isSwapperFiatRampsEnabled,
    popularAssets,
    portfolioAssetsSortedByBalanceForChain,
    workerSearchState,
    renferFiatItem,
    searchFiats,
    searchString,
    showFiatTab,
    showAssetTab,
  ])

  return (
    <>
      <CustomAssetAcknowledgement
        asset={assetToImport}
        handleAssetClick={handleAssetClick}
        shouldShowWarningAcknowledgement={shouldShowWarningAcknowledgement}
        setShouldShowWarningAcknowledgement={setShouldShowWarningAcknowledgement}
      />
      <Stack
        gap={4}
        px={4}
        pb={4}
        as='form'
        visibility='visible'
        borderBottomWidth={1}
        borderColor='border.base'
        onSubmit={handleSubmit}
        {...formProps}
      >
        <Flex gap={2} alignItems='center'>
          <InputGroup>
            {/* Override zIndex to prevent element displaying on overlay components */}
            <InputLeftElement pointerEvents='none' zIndex={1}>
              <SearchIcon color='gray.300' />
            </InputLeftElement>
            <Input {...inputProps} />
          </InputGroup>
          {showAssetTab && (
            <AllChainMenu
              activeChainId={activeChainId}
              chainIds={chainIds}
              isActiveChainIdSupported={true}
              isDisabled={false}
              onMenuOptionClick={handleSelectedChainIdChange}
              buttonProps={buttonProps}
              disableTooltip
            />
          )}
        </Flex>
        {showAssetTab && (
          <Flex flexWrap='wrap' gap={2}>
            {quickAccessAssetButtons}
          </Flex>
        )}
      </Stack>
      {listContent}
    </>
  )
}
