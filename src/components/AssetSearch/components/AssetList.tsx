import type { ListProps } from '@chakra-ui/react'
import { Box, Center, Flex, Icon, Skeleton } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { range } from 'lodash'
import type { CSSProperties, FC } from 'react'
import { useCallback, useMemo } from 'react'
import { FaRegCompass } from 'react-icons/fa6'
import { Virtuoso } from 'react-virtuoso'

import type { AssetRowData } from './AssetRow'
import { AssetRow } from './AssetRow'

import { Text } from '@/components/Text'
import type { PortalsAssets } from '@/pages/Markets/hooks/usePortalsAssetsQuery'

export type AssetData = {
  assets: Asset[]
  handleClick: (asset: Asset) => void
  handleLongPress?: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
  rowComponent?: FC<AssetRowData>
  isLoading?: boolean
  portalsAssets?: PortalsAssets
  showPrice?: boolean
  onImportClick?: (asset: Asset) => void
  showRelatedAssets?: boolean
}

type AssetListProps = AssetData & ListProps

const scrollbarStyle: CSSProperties = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
}

export const INCREASE_VIEWPORT_BY = { top: 300, bottom: 100 } as const

export const AssetList: FC<AssetListProps> = ({
  assets,
  handleClick,
  handleLongPress,
  disableUnsupported = false,
  hideZeroBalanceAmounts = true,
  rowComponent = AssetRow,
  isLoading = false,
  portalsAssets,
  showPrice = false,
  height = '50vh',
  onImportClick,
  showRelatedAssets = false,
}) => {
  const virtuosoStyle = useMemo(
    () => ({
      height: typeof height === 'string' ? height : `${height}px`,
      ...scrollbarStyle,
    }),
    [height],
  )

  const itemData = useMemo(
    () => ({
      assets,
      handleClick,
      handleLongPress,
      disableUnsupported,
      hideZeroBalanceAmounts,
      portalsAssets,
      onImportClick,
      showRelatedAssets,
    }),
    [
      assets,
      disableUnsupported,
      handleClick,
      handleLongPress,
      hideZeroBalanceAmounts,
      portalsAssets,
      onImportClick,
      showRelatedAssets,
    ],
  )

  const renderRow = useCallback(
    (index: number) => {
      const asset = assets[index]
      const RowComponent = rowComponent

      return (
        <RowComponent
          asset={asset}
          index={index}
          data={itemData}
          showPrice={showPrice}
          onImportClick={onImportClick}
          showRelatedAssets={showRelatedAssets}
        />
      )
    },
    [assets, itemData, rowComponent, showPrice, onImportClick, showRelatedAssets],
  )

  if (isLoading) {
    return (
      <Flex flexDir='column' width='100%' overflowY='auto' flex='1' minHeight={0} mt={4} px={2}>
        {range(3).map(index => (
          <Flex key={index} align='center' width='100%' justifyContent='space-between' mb={4}>
            <Flex align='center'>
              <Skeleton width='40px' height='40px' borderRadius='100%' me={2} />
              <Flex flexDir='column' gap={2}>
                <Skeleton width='140px' height='18px' />
                <Skeleton width='80px' height='18px' />
              </Flex>
            </Flex>
            <Flex align='flex-end' flexDir='column' gap={2}>
              <Skeleton width='120px' height='18px' />
              <Skeleton width='80px' height='18px' />
            </Flex>
          </Flex>
        ))}
      </Flex>
    )
  }

  if (assets?.length === 0) {
    return (
      <Center flexDir='column' gap={2} mt={4}>
        <Icon as={FaRegCompass} boxSize='24px' color='text.subtle' />
        <Text color='text.subtle' translation='common.noResultsFound' />
      </Center>
    )
  }

  if (assets.length <= 10) {
    return (
      <Box maxHeight={height} overflow='auto' height='auto'>
        {assets.map((asset, index) => (
          <Box key={asset.assetId}>{renderRow(index)}</Box>
        ))}
      </Box>
    )
  }

  return (
    <Virtuoso
      data={assets}
      itemContent={renderRow}
      style={virtuosoStyle}
      overscan={1000}
      increaseViewportBy={INCREASE_VIEWPORT_BY}
    />
  )
}
