import { SearchIcon } from '@chakra-ui/icons'
import type { CardProps } from '@chakra-ui/react'
import {
  Box,
  Card,
  CardBody,
  Center,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Stack,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { ChangeEvent, FormEvent, JSX } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { IoClose } from 'react-icons/io5'
import { RiArrowRightUpLine } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { AssetSearchRow } from './components/AssetSearchRow'
import { CategoryCard } from './components/CategoryCard'
import { Tags } from './components/Tags'

import { AssetList } from '@/components/AssetSearch/components/AssetList'
import { Carousel } from '@/components/Carousel/Carousel'
import { DefiIcon } from '@/components/Icons/DeFi'
import { FoxIcon } from '@/components/Icons/FoxIcon'
import { PoolsIcon } from '@/components/Icons/Pools'
import { TCYIcon } from '@/components/Icons/TCYIcon'
import { PageHeader } from '@/components/Layout/Header/PageHeader'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { Text } from '@/components/Text'
import { useAssetSearchWorker } from '@/components/TradeAssetSearch/hooks/useAssetSearchWorker'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { vibrate } from '@/lib/vibrate'
import { MarketsCategories } from '@/pages/Markets/constants'
import { selectAssets, selectMarketDataUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ExploreCardProps = {
  title: string
  body: string
  icon: JSX.Element
} & CardProps

const activeCard = {
  opacity: '0.5',
}

const linkIcon = <RiArrowRightUpLine />

const ExploreCard: React.FC<ExploreCardProps> = props => {
  const { title, body, icon, ...rest } = props
  return (
    <Card _active={activeCard} {...rest}>
      <CardBody display='flex' flexDir='column' alignItems='flex-start'>
        <Center fontSize='4xl' width='auto' mb={2} opacity={'0.3'}>
          {icon}
        </Center>
        <Stack>
          <Text fontWeight='bold' translation={title} />
          <Text color='whiteAlpha.700' translation={body} />
        </Stack>
        <Center fontSize='lg' width='auto' opacity={'0.3'} position='absolute' right={4} top={4}>
          {linkIcon}
        </Center>
      </CardBody>
    </Card>
  )
}

const poolsIcon = <PoolsIcon />
const foxIcon = <FoxIcon />
const tcyIcon = <TCYIcon />
const defiIcon = <DefiIcon />

const pageProps = { paddingTop: 4 }

const carouselOptions = {
  loop: true,
}

export const Explore = memo(() => {
  const translate = useTranslate()
  const navigate = useNavigate()

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

  const handlePoolsClick = useCallback(() => {
    navigate('/pools')
  }, [navigate])

  const handleFoxClick = useCallback(() => {
    navigate('/fox')
  }, [navigate])

  const handleTCYClick = useCallback(() => {
    navigate('/tcy')
  }, [navigate])

  const handleEarnClick = useCallback(() => {
    navigate('/wallet/earn')
  }, [navigate])

  const handleAssetClick = useCallback(
    (asset: Asset) => {
      vibrate('heavy')
      navigate(`/assets/${asset.assetId}`)
    },
    [navigate],
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
              ? 'calc(100vh - var(--mobile-nav-offset) - env(safe-area-inset-bottom) - var(--safe-area-inset-bottom) - 98px - 1rem)'
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
              rowComponent={AssetSearchRow}
            />
          )}
        </Box>

        <Box display={isSearching ? 'none' : 'block'}>
          <Tags />

          <Flex flexDir='column' gap={6}>
            <Carousel autoPlay showDots options={carouselOptions}>
              <ExploreCard
                title='navBar.foxEcosystem'
                body='explore.foxEcosystem.body'
                icon={foxIcon}
                onClick={handleFoxClick}
              />
              <ExploreCard
                title='explore.pools.title'
                body='explore.pools.body'
                icon={poolsIcon}
                onClick={handlePoolsClick}
              />
              <ExploreCard
                title='explore.tcy.title'
                body='explore.tcy.body'
                icon={tcyIcon}
                onClick={handleTCYClick}
              />
              <ExploreCard
                title='navBar.defi'
                body='defi.myPositionsBody'
                icon={defiIcon}
                onClick={handleEarnClick}
              />
            </Carousel>
          </Flex>

          <CategoryCard
            category={MarketsCategories.Trending}
            title={translate('common.trendingTokens')}
            maxAssets={3}
          />

          <CategoryCard
            category={MarketsCategories.TopMovers}
            title={translate('markets.categories.topMovers.title')}
            layout='horizontal'
            maxAssets={10}
          />

          <CategoryCard
            category={MarketsCategories.MarketCap}
            title={translate('markets.categories.marketCap.title')}
            maxAssets={3}
          />

          <CategoryCard
            category={MarketsCategories.OneClickDefi}
            title={translate('markets.categories.oneClickDefiAssets.title')}
            maxAssets={3}
          />
        </Box>
      </Main>
    </>
  )
})
