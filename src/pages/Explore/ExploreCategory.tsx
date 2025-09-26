import { SearchIcon } from '@chakra-ui/icons'
import { Box, Icon, Input, InputGroup, InputLeftElement, InputRightElement } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { bnOrZero } from '@shapeshiftoss/utils'
import { debounce } from 'lodash'
import { matchSorter } from 'match-sorter'
import type { ChangeEvent, FormEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { IoClose } from 'react-icons/io5'
import { MdOutlineFilterAlt } from 'react-icons/md'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams } from 'react-router-dom'

import { MarketsCategories } from '../Markets/constants'
import { CATEGORY_TO_QUERY_HOOK } from '../Markets/hooks/useCoingeckoData'
import { usePortalsAssetsQuery } from '../Markets/hooks/usePortalsAssetsQuery'
import { useRows } from '../Markets/hooks/useRows'
import { Tags } from './components/Tags'

import { AssetListFiltersDialog } from '@/components/AssetListFiltersDialog/AssetListFiltersDialog'
import { AssetList } from '@/components/AssetSearch/components/AssetList'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { OrderDirection } from '@/components/OrderDropdown/types'
import { SortOptionsKeys } from '@/components/SortDropdown/types'
import { useModal } from '@/hooks/useModal/useModal'
import { isSome } from '@/lib/utils'
import { PortalAssetRow } from '@/pages/Explore/components/PortalAssetRow'
import { marketData } from '@/state/slices/marketDataSlice/marketDataSlice'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const pageProps = { paddingTop: 4 }

export const ExploreCategory = () => {
  const { category, tag: tagParam } = useParams<{ category: MarketsCategories; tag?: string }>()
  const translate = useTranslate()
  const navigate = useNavigate()
  const assetsById = useAppSelector(selectAssets)
  const marketDataUsd = useAppSelector(marketData.selectors.selectMarketDataUsd)
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false)
  const [selectedSort, setSelectedSort] = useState<SortOptionsKeys>(
    category === MarketsCategories.MarketCap ? SortOptionsKeys.MarketCap : SortOptionsKeys.Volume,
  )
  const [selectedOrder, setSelectedOrder] = useState<OrderDirection>(OrderDirection.Descending)
  const [selectedChainId, setSelectedChainId] = useState<ChainId | 'all'>('all')

  const tag = useMemo(() => (tagParam ? `#${tagParam}` : undefined), [tagParam])
  const assetActionsDrawer = useModal('assetActionsDrawer')

  const { register, watch, setValue } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: '',
    },
  })

  const searchString = watch('search')
  const isSearching = Boolean(searchString.length)

  const categoryHook = useMemo(() => {
    if (category === MarketsCategories.OneClickDefi) {
      return CATEGORY_TO_QUERY_HOOK[MarketsCategories.Trending]
    }

    if (category) {
      return CATEGORY_TO_QUERY_HOOK[category]
    }

    return CATEGORY_TO_QUERY_HOOK[MarketsCategories.Trending]
  }, [category])

  const rows = useRows({ limit: 250 })

  const { data: categoryQueryData, isLoading: isCategoryQueryDataLoading } = categoryHook({
    enabled: category !== MarketsCategories.OneClickDefi,
    orderBy: selectedOrder,
    sortBy: selectedSort,
    page: category === MarketsCategories.MarketCap ? 1 : undefined,
    limit: category === MarketsCategories.MarketCap ? 250 : undefined,
  })

  const { data: portalsAssets, isLoading: isPortalsAssetsLoading } = usePortalsAssetsQuery({
    enabled: true,
    chainIds:
      category && selectedChainId === 'all' ? rows[category].supportedChainIds : [selectedChainId],
    sortBy: selectedSort,
    orderBy: selectedOrder,
    tags: tag ? [tag] : undefined,
    minApy: '1',
  })

  const oneClickDefiAssets = useMemo(() => {
    if (category !== MarketsCategories.OneClickDefi || !portalsAssets) return []

    return portalsAssets.ids.map(id => assetsById[id]).filter(isSome)
  }, [category, portalsAssets, assetsById])

  const categoryAssets = useMemo(() => {
    if (category === MarketsCategories.OneClickDefi || !categoryQueryData) return []

    return categoryQueryData.ids.map(id => assetsById[id]).filter(isSome)
  }, [category, categoryQueryData, assetsById])

  const filteredAssets = useMemo(() => {
    const selectedAssets =
      category === MarketsCategories.OneClickDefi ? oneClickDefiAssets : categoryAssets
    if (!isSearching)
      return selectedChainId === 'all'
        ? selectedAssets
        : selectedAssets.filter(asset => asset.chainId === selectedChainId)

    // Filters by low market-cap to avoid spew
    const filteredAssets = selectedAssets.filter(asset => {
      const marketCap = marketDataUsd[asset.assetId]?.marketCap
      const hasPositiveMarketCapAndOver1000 =
        bnOrZero(marketCap).isZero() || bnOrZero(marketCap).gte(1000)

      if (selectedChainId === 'all') {
        return hasPositiveMarketCapAndOver1000
      }

      return hasPositiveMarketCapAndOver1000 && asset.chainId === selectedChainId
    })

    const matchedAssets = matchSorter(filteredAssets, searchString, {
      keys: [
        { key: 'name', threshold: matchSorter.rankings.MATCHES },
        { key: 'symbol', threshold: matchSorter.rankings.WORD_STARTS_WITH },
        { key: 'assetId', threshold: matchSorter.rankings.CONTAINS },
      ],
    })

    return matchedAssets.slice(0, 20)
  }, [
    oneClickDefiAssets,
    categoryAssets,
    category,
    isSearching,
    marketDataUsd,
    searchString,
    selectedChainId,
  ])

  const handleSubmit = useCallback((e: FormEvent<unknown>) => e.preventDefault(), [])

  const handleClearSearch = useCallback(() => {
    setValue('search', '')
  }, [setValue])

  const handleSearchInputChange = useCallback(
    (value: string) => {
      setValue('search', value)
    },
    [setValue],
  )

  const debouncedSetSearch = useMemo(
    () => debounce(handleSearchInputChange, 200),
    [handleSearchInputChange],
  )

  const inputProps = useMemo(
    () => ({
      ...register('search'),
      type: 'text',
      placeholder: translate('common.searchNameOrAddress'),
      pl: 10,
      variant: 'filled',
      autoComplete: 'off',
      autoFocus: false,
      transitionProperty: 'none',
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.value === '') {
          setValue('search', '')
          return
        }
        debouncedSetSearch(e.target.value)
      },
    }),
    [register, translate, debouncedSetSearch, setValue],
  )

  const handleAssetClick = useCallback(
    (asset: Asset) => {
      navigate(`/assets/${asset.assetId}`)
    },
    [navigate],
  )

  const handleBackClick = useCallback(() => {
    navigate('/explore', { replace: true })
  }, [navigate])

  const handleOpenFiltersDialog = useCallback(() => {
    setIsFiltersDialogOpen(true)
  }, [])

  const handleCloseFiltersDialog = useCallback(() => {
    setIsFiltersDialogOpen(false)
  }, [])

  const handleSortChange = useCallback((sort: SortOptionsKeys) => {
    setSelectedSort(sort)
  }, [])

  const handleOrderChange = useCallback((order: OrderDirection) => {
    setSelectedOrder(order)
  }, [])

  const handleChainIdChange = useCallback((chainId: ChainId | 'all') => {
    setSelectedChainId(chainId)
  }, [])

  const handleAssetLongPress = useCallback(
    (asset: Asset) => {
      const { assetId } = asset
      assetActionsDrawer.open({ assetId })
    },
    [assetActionsDrawer],
  )

  if (!category) return null

  return (
    <>
      <PageHeader>
        <PageHeader.Left>
          <PageBackButton onBack={handleBackClick} />
        </PageHeader.Left>
        <PageHeader.Middle>
          <PageHeader.Title>{translate(`markets.categories.${category}.title`)}</PageHeader.Title>
        </PageHeader.Middle>
        <PageHeader.Right>
          <Icon
            as={MdOutlineFilterAlt}
            boxSize='20px'
            color='text.subtle'
            onClick={handleOpenFiltersDialog}
          />
        </PageHeader.Right>
      </PageHeader>
      <Main px={4} pt={0} gap={4} width='full' pageProps={pageProps}>
        <SEO title={translate('navBar.explore')} />

        <Box
          display='flex'
          flexDir='column'
          flex='1 1 auto'
          height={
            'calc(100vh - var(--mobile-nav-offset) - env(safe-area-inset-bottom) - var(--safe-area-inset-bottom) - 40px - 1rem)'
          }
        >
          <Box as='form' flex='0 0 auto' mb={3} visibility='visible' onSubmit={handleSubmit}>
            <InputGroup size='md'>
              <InputLeftElement pointerEvents='none' zIndex={1}>
                <SearchIcon color='text.subtle' fontSize='md' />
              </InputLeftElement>
              <Input {...inputProps} />
              <InputRightElement>
                {isSearching ? <IoClose onClick={handleClearSearch} /> : null}
              </InputRightElement>
            </InputGroup>
          </Box>
          {category === MarketsCategories.OneClickDefi && <Tags />}

          <AssetList
            assets={filteredAssets}
            handleClick={handleAssetClick}
            disableUnsupported={false}
            portalsAssets={portalsAssets}
            isLoading={
              (category === MarketsCategories.OneClickDefi && isPortalsAssetsLoading) ||
              isCategoryQueryDataLoading
            }
            height='100vh'
            showPrice
            showRelatedAssets
            handleLongPress={handleAssetLongPress}
            rowComponent={category === MarketsCategories.OneClickDefi ? PortalAssetRow : undefined}
          />
        </Box>
      </Main>
      <AssetListFiltersDialog
        isOpen={isFiltersDialogOpen}
        onClose={handleCloseFiltersDialog}
        selectedCategory={category}
        selectedSort={selectedSort}
        selectedOrder={selectedOrder}
        selectedChainId={selectedChainId}
        handleSortChange={handleSortChange}
        handleOrderChange={handleOrderChange}
        handleChainIdChange={handleChainIdChange}
      />
    </>
  )
}
