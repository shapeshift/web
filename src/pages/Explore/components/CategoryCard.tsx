import { Box, Button, Flex, Skeleton, Text as CText, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import range from 'lodash/range'
import { memo, useCallback, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { AssetCard } from './AssetCard'

import { AssetRow } from '@/components/AssetSearch/components/AssetRow'
import { OrderDirection } from '@/components/OrderDropdown/types'
import { SortOptionsKeys } from '@/components/SortDropdown/types'
import { Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { isSome } from '@/lib/utils'
import { vibrate } from '@/lib/vibrate'
import { PortalAssetRow } from '@/pages/Explore/components/PortalAssetRow'
import { MarketsCategories } from '@/pages/Markets/constants'
import { CATEGORY_TO_QUERY_HOOK } from '@/pages/Markets/hooks/useCoingeckoData'
import { usePortalsAssetsQuery } from '@/pages/Markets/hooks/usePortalsAssetsQuery'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type CategoryCardProps = {
  category: MarketsCategories
  title: string
  maxAssets?: number
  layout?: 'vertical' | 'horizontal'
}

const emptyStyle = {}

export const CategoryCard = memo(
  ({ category, title, maxAssets = 3, layout = 'vertical' }: CategoryCardProps) => {
    'use no memo'
    const navigate = useNavigate()
    const assetsById = useAppSelector(selectAssets)
    const assetTitleColor = useColorModeValue('black', 'white')
    const translate = useTranslate()
    const assetActionsDrawer = useModal('assetActionsDrawer')
    const { ref, inView } = useInView({
      initialInView:
        category === MarketsCategories.Trending || category === MarketsCategories.TopMovers,
    })

    const categoryHook =
      category === MarketsCategories.OneClickDefi
        ? CATEGORY_TO_QUERY_HOOK[MarketsCategories.Trending]
        : CATEGORY_TO_QUERY_HOOK[category]

    const {
      data: categoryQueryData,
      isLoading: isCategoryQueryDataLoading,
      isError: isCategoryQueryDataError,
    } = categoryHook({
      enabled: category !== MarketsCategories.OneClickDefi && inView,
      orderBy: OrderDirection.Descending,
      sortBy:
        category === MarketsCategories.MarketCap
          ? SortOptionsKeys.MarketCap
          : SortOptionsKeys.PriceChange,
      page: category === MarketsCategories.MarketCap ? 1 : undefined,
      limit: category === MarketsCategories.MarketCap ? 250 : undefined,
    })

    const {
      data: portalsAssets,
      isLoading: isPortalsAssetsLoading,
      isError: isPortalsAssetsError,
    } = usePortalsAssetsQuery({
      chainIds: [],
      enabled: category === MarketsCategories.OneClickDefi && inView,
      sortBy: SortOptionsKeys.Volume,
      orderBy: OrderDirection.Descending,
      minApy: '1',
    })

    const oneClickDefiAssets = useMemo(() => {
      if (category !== MarketsCategories.OneClickDefi || !portalsAssets) return []

      return portalsAssets.ids
        .slice(0, maxAssets)
        .map(id => assetsById[id])
        .filter(isSome)
    }, [category, portalsAssets, assetsById, maxAssets])

    const categoryAssets = useMemo(() => {
      if (category === MarketsCategories.OneClickDefi || !categoryQueryData) return []

      return categoryQueryData.ids
        .slice(0, maxAssets)
        .map(id => assetsById[id])
        .filter(isSome)
    }, [category, categoryQueryData, assetsById, maxAssets])

    const filteredAssets = useMemo(() => {
      return category === MarketsCategories.OneClickDefi ? oneClickDefiAssets : categoryAssets
    }, [oneClickDefiAssets, categoryAssets, category])

    const isLoading =
      isCategoryQueryDataLoading ||
      (category === MarketsCategories.OneClickDefi && isPortalsAssetsLoading)
    const isError = isCategoryQueryDataError || isPortalsAssetsError

    const assetSearchRowData = useMemo(() => {
      return {
        assets: filteredAssets,
        handleClick: (asset: Asset) => {
          vibrate('heavy')
          navigate(`/assets/${asset.assetId}`)
        },
        handleLongPress: ({ assetId }: Asset) => {
          assetActionsDrawer.open({ assetId })
        },
        portalsAssets,
      }
    }, [filteredAssets, portalsAssets, navigate, assetActionsDrawer])

    const handleSeeMoreClick = useCallback(() => {
      navigate(`/explore/category/${category}`)
    }, [navigate, category])

    const content = useMemo(() => {
      if (isLoading || !inView) {
        if (layout === 'horizontal') {
          return (
            <Flex gap={4} overflowX='auto' pb={2} pe={4}>
              {range(2).map(index => (
                <Skeleton
                  key={index}
                  display='block'
                  width='300px'
                  height='137px'
                  borderRadius='10px'
                />
              ))}
            </Flex>
          )
        }

        return (
          <Flex flexDir='column' width='100%'>
            {range(maxAssets).map(index => (
              <Flex
                key={index}
                align='center'
                width='100%'
                justifyContent='space-between'
                py={4}
                px={4}
              >
                <Flex align='center'>
                  <Skeleton width='40px' height='40px' borderRadius='100%' me={2} />
                  <Flex flexDir='column' gap={1}>
                    <Skeleton width='100px' height='16px' />
                    <Skeleton width='60px' height='14px' />
                  </Flex>
                </Flex>
                <Flex align='flex-end' flexDir='column' gap={1}>
                  <Skeleton width='60px' height='16px' />
                  <Skeleton width='40px' height='14px' />
                </Flex>
              </Flex>
            ))}
          </Flex>
        )
      }

      if (isError || !filteredAssets?.length) {
        return (
          <Flex flexDir='column' alignItems='center' justifyContent='center' py={4}>
            <Text fontSize='sm' color='text.subtle' translation='markets.emptyTitle' />
          </Flex>
        )
      }

      if (layout === 'horizontal') {
        return (
          <Flex gap={4} overflowX='auto' pb={2}>
            {filteredAssets.map(asset => (
              <AssetCard key={asset.assetId} asset={asset} />
            ))}
          </Flex>
        )
      }

      if (category === MarketsCategories.OneClickDefi) {
        return (
          <Flex flexDir='column' width='100%'>
            {filteredAssets.map((asset, index) => (
              <PortalAssetRow
                key={asset.assetId}
                asset={asset}
                data={assetSearchRowData}
                index={index}
                // We are not virtualizing so we don't use this prop but reuse the component for simplicity/reusability
                style={emptyStyle}
                color={assetTitleColor}
                showNetworkIcon={false}
                portalsAssets={portalsAssets}
              />
            ))}
          </Flex>
        )
      }

      return (
        <Flex flexDir='column' width='100%'>
          {filteredAssets.map((asset, index) => (
            <AssetRow
              key={asset.assetId}
              asset={asset}
              data={assetSearchRowData}
              index={index}
              // We are not virtualizing so we don't use this prop but reuse the component for simplicity/reusability
              style={emptyStyle}
              color={assetTitleColor}
              showPrice={category !== MarketsCategories.MarketCap}
              showMarketCap={category === MarketsCategories.MarketCap}
            />
          ))}
        </Flex>
      )
    }, [
      isLoading,
      isError,
      filteredAssets,
      assetSearchRowData,
      assetTitleColor,
      layout,
      maxAssets,
      portalsAssets,
      category,
      inView,
    ])

    return (
      <Flex
        flexDir='column'
        width={layout === 'horizontal' ? 'calc(100% + 32px)' : '100%'}
        my={6}
        mx={layout === 'horizontal' ? -4 : 0}
        pl={layout === 'horizontal' ? 4 : 0}
        ref={ref}
      >
        <Flex
          alignItems='center'
          justifyContent='space-between'
          pe={layout === 'horizontal' ? 4 : 0}
        >
          <CText color='text.primary' fontWeight='bold' fontSize='lg' mb={2}>
            {title}
          </CText>
          <Button variant='link' size='sm' colorScheme='blue' onClick={handleSeeMoreClick}>
            {translate('common.seeMore')}
          </Button>
        </Flex>

        <Box py={layout === 'horizontal' ? 0 : 2} borderRadius='10'>
          {content}
        </Box>
      </Flex>
    )
  },
)
