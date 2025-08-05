import { Box, Flex, Skeleton, Text as CText, useColorModeValue } from '@chakra-ui/react'
import range from 'lodash/range'
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { AssetSearchRow } from './AssetSearchRow'

import { OrderDirection } from '@/components/OrderDropdown/types'
import { SortOptionsKeys } from '@/components/SortDropdown/types'
import { Text } from '@/components/Text'
import { isSome } from '@/lib/utils'
import { MarketsCategories } from '@/pages/Markets/constants'
import { CATEGORY_TO_QUERY_HOOK } from '@/pages/Markets/hooks/useCoingeckoData'
import { usePortalsAssetsQuery } from '@/pages/Markets/hooks/usePortalsAssetsQuery'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

interface CategoryCardProps {
  category: MarketsCategories
  title: string
  maxAssets?: number
}

export const CategoryCard = ({ category, title, maxAssets = 3 }: CategoryCardProps) => {
  const assetsById = useAppSelector(selectAssets)
  const navigate = useNavigate()
  const assetTitleColor = useColorModeValue('black', 'white')

  const categoryHook =
    category === MarketsCategories.OneClickDefi
      ? CATEGORY_TO_QUERY_HOOK[MarketsCategories.Trending]
      : CATEGORY_TO_QUERY_HOOK[category]

  const {
    data: categoryQueryData,
    isLoading: isCategoryQueryDataLoading,
    isError: isCategoryQueryDataError,
  } = categoryHook({
    enabled: category !== MarketsCategories.OneClickDefi,
    orderBy: OrderDirection.Descending,
    sortBy: SortOptionsKeys.PriceChange,
  })

  const {
    data: portalsAssets,
    isLoading: isPortalsAssetsLoading,
    isError: isPortalsAssetsError,
  } = usePortalsAssetsQuery({
    chainIds: [],
    enabled: category === MarketsCategories.OneClickDefi,
    sortBy: SortOptionsKeys.Apy,
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

  const isLoading = isCategoryQueryDataLoading || isPortalsAssetsLoading
  const isError = isCategoryQueryDataError || isPortalsAssetsError

  const handleAssetClick = useCallback(
    (asset: any) => {
      navigate(`/assets/${asset.assetId}`)
    },
    [navigate],
  )

  const assetSearchRowData = useMemo(() => {
    return {
      assets: filteredAssets,
      handleClick: handleAssetClick,
    }
  }, [filteredAssets, handleAssetClick])

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <Flex flexDir='column' width='100%'>
          {range(maxAssets).map(index => (
            <Flex
              key={index}
              align='center'
              width='100%'
              justifyContent='space-between'
              px={4}
              py={2}
            >
              <Flex align='center'>
                <Skeleton width='32px' height='32px' borderRadius='100%' me={2} />
                <Flex flexDir='column' gap={1}>
                  <Skeleton width='100px' height='14px' />
                  <Skeleton width='60px' height='12px' />
                </Flex>
              </Flex>
              <Flex align='flex-end' flexDir='column' gap={1}>
                <Skeleton width='60px' height='14px' />
                <Skeleton width='40px' height='12px' />
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

    return (
      <Flex flexDir='column' width='100%'>
        {filteredAssets.map((asset, index) => {
          return (
            <AssetSearchRow
              key={asset.assetId}
              data={assetSearchRowData}
              index={index}
              my={2}
              // We are not virtualizing so we don't use this prop but reuse the component for simplicity/reusability
              // eslint-disable-next-line react-memo/require-usememo
              style={{}}
              color={assetTitleColor}
              showNetworkIcon={false}
            />
          )
        })}
      </Flex>
    )
  }, [isLoading, maxAssets, filteredAssets, assetSearchRowData, assetTitleColor, isError])

  return (
    <Flex flexDir='column' width='100%' my={6}>
      <CText color='text.primary' fontWeight='bold' fontSize='lg' mb={2}>
        {title}
      </CText>

      <Box py={2} bg='background.surface.raised.base' borderRadius='10'>
        {content}
      </Box>
    </Flex>
  )
}
