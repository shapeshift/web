import { SearchIcon } from '@chakra-ui/icons'
import { Box, Flex, Input, InputGroup, InputLeftElement, InputRightElement } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { ChangeEvent, FormEvent } from 'react'
import { memo, Suspense, useCallback, useMemo } from 'react'
import { IoClose } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { CategoryCard } from './components/CategoryCard'
import { LazyCarousel } from './components/LazyCarousel'
import { Tags } from './components/Tags'

import { AssetList } from '@/components/AssetSearch/components/AssetList'
import { PageHeader } from '@/components/Layout/Header/PageHeader'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { useAssetSearchWorker } from '@/components/TradeAssetSearch/hooks/useAssetSearchWorker'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { vibrate } from '@/lib/vibrate'
import { MarketsCategories } from '@/pages/Markets/constants'
import { selectAssets, selectMarketDataUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const pageProps = { paddingTop: 4 }

export const Explore = memo(() => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const assetActionsDrawer = useModal('assetActionsDrawer')

  const allAssets = useAppSelector(selectAssets)
  const marketDataUsd = useAppSelector(selectMarketDataUserCurrency)

  // Use the asset search worker with default params for explore (no chain filtering)
  const { searchString, workerSearchState, handleSearchChange } = useAssetSearchWorker({
    activeChainId: 'All',
    allowWalletUnsupportedAssets: true,
    hasWallet: false, // For explore, we always show all assets
  })

  const isSearching = Boolean(searchString.length)

  // Filter worker results by market cap and limit to 20 results
  const assetResults = useMemo(() => {
    if (!isSearching || !workerSearchState.searchResults) return []

    const filteredAssets = workerSearchState.searchResults
      .map(assetId => allAssets[assetId])
      .filter((asset): asset is Asset => {
        if (!asset) return false
        const marketCap = marketDataUsd[asset.assetId]?.marketCap
        return bnOrZero(marketCap).isZero() || bnOrZero(marketCap).gte(1000)
      })
      .slice(0, 20)

    return filteredAssets
  }, [workerSearchState.searchResults, allAssets, marketDataUsd, isSearching])

  const handleAssetClick = useCallback(
    (asset: Asset) => {
      vibrate('heavy')
      navigate(`/assets/${asset.assetId}`)
    },
    [navigate],
  )

  const handleAssetLongPress = useCallback(
    (asset: Asset) => {
      const { assetId } = asset
      assetActionsDrawer.open({ assetId })
    },
    [assetActionsDrawer],
  )

  const inputProps = useMemo(
    () => ({
      value: searchString,
      onChange: handleSearchChange,
      type: 'text',
      placeholder: translate('common.searchNameOrAddress'),
      pl: 10,
      variant: 'filled',
      autoComplete: 'off',
      autoFocus: false,
      transitionProperty: 'none',
    }),
    [searchString, handleSearchChange, translate],
  )

  const handleSubmit = useCallback((e: FormEvent<unknown>) => e.preventDefault(), [])

  const handleClearSearch = useCallback(() => {
    // Clear the search by simulating an empty input change
    handleSearchChange({ target: { value: '' } } as ChangeEvent<HTMLInputElement>)
  }, [handleSearchChange])

  return (
    <>
      <PageHeader>
        <PageHeader.Middle>
          <PageHeader.Title>{translate('navBar.explore')}</PageHeader.Title>
        </PageHeader.Middle>
      </PageHeader>
      <Main px={4} pt={0} gap={4} width='full' pageProps={pageProps}>
        <SEO title={translate('navBar.explore')} />

        <Box
          display='flex'
          flexDir='column'
          flex='1 1 auto'
          height={
            isSearching
              ? 'calc(100vh - var(--mobile-nav-offset) - env(safe-area-inset-bottom) - var(--safe-area-inset-bottom) - 40px - 1rem)'
              : 'auto'
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
          {isSearching && (
            <AssetList
              isLoading={workerSearchState.isSearching}
              assets={assetResults}
              handleClick={handleAssetClick}
              disableUnsupported={false}
              height='100vh'
              showPrice
              showRelatedAssets
              handleLongPress={handleAssetLongPress}
            />
          )}
        </Box>

        <Box display={isSearching ? 'none' : 'block'}>
          <Tags />

          <Flex flexDir='column' gap={6}>
            <Suspense fallback={null}>
              <LazyCarousel delay={200} />
            </Suspense>
          </Flex>

          <Suspense fallback={null}>
            <CategoryCard
              category={MarketsCategories.Trending}
              title={translate('common.trendingTokens')}
              maxAssets={3}
              priority={0}
            />
          </Suspense>

          <Suspense fallback={null}>
            <CategoryCard
              category={MarketsCategories.TopMovers}
              title={translate('markets.categories.topMovers.title')}
              layout='horizontal'
              maxAssets={10}
              priority={1}
            />
          </Suspense>

          <Suspense fallback={null}>
            <CategoryCard
              category={MarketsCategories.MarketCap}
              title={translate('markets.categories.marketCap.title')}
              maxAssets={3}
              priority={2}
            />
          </Suspense>

          <Suspense fallback={null}>
            <CategoryCard
              category={MarketsCategories.OneClickDefi}
              title={translate('markets.categories.oneClickDefiAssets.title')}
              maxAssets={3}
              priority={3}
            />
          </Suspense>
        </Box>
      </Main>
    </>
  )
})
