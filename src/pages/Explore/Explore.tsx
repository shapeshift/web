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
import debounce from 'lodash/debounce'
import type { ChangeEvent, FormEvent, JSX } from 'react'
import { memo, useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { IoClose } from 'react-icons/io5'
import { RiArrowRightUpLine } from 'react-icons/ri'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useFeatureFlag } from '../../hooks/useFeatureFlag/useFeatureFlag'
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
import { vibrate } from '@/lib/vibrate'
import { MarketsCategories } from '@/pages/Markets/constants'
import { selectAssetsBySearchQuery } from '@/state/slices/common-selectors'
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
  const isRfoxFoxEcosystemPageEnabled = useFeatureFlag('RfoxFoxEcosystemPage')

  const { register, watch, setValue } = useForm<{ search: string }>({
    mode: 'onChange',
    defaultValues: {
      search: '',
    },
  })

  const searchString = watch('search')
  const isSearching = Boolean(searchString.length)

  const searchFilter = useMemo(() => ({ searchQuery: searchString, limit: 20 }), [searchString])
  const assetResults = useAppSelector(state => selectAssetsBySearchQuery(state, searchFilter))

  const handlePoolsClick = useCallback(() => {
    navigate('/pools')
  }, [navigate])

  const handleFoxClick = useCallback(() => {
    navigate(isRfoxFoxEcosystemPageEnabled ? '/fox-ecosystem' : '/fox')
  }, [navigate, isRfoxFoxEcosystemPageEnabled])

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

  const handleSubmit = useCallback((e: FormEvent<unknown>) => e.preventDefault(), [])

  const handleClearSearch = useCallback(() => {
    setValue('search', '')
  }, [setValue])

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
          {isSearching ? (
            <AssetList
              assets={assetResults}
              handleClick={handleAssetClick}
              disableUnsupported={false}
              rowComponent={AssetSearchRow}
            />
          ) : null}
        </Box>

        {!isSearching && <Tags />}

        <Box display={isSearching ? 'none' : 'block'}>
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
