import type { ListProps } from '@chakra-ui/react'
import { Center, Flex, Icon, Skeleton } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { range } from 'lodash'
import type { CSSProperties, FC } from 'react'
import { useCallback, useMemo } from 'react'
import { FaRegCompass } from 'react-icons/fa6'
import { Virtuoso } from 'react-virtuoso'

import { AssetRow } from './AssetRow'

import { GroupedAssetRow } from '@/components/AssetSearch/components/GroupedAssetRow'
import { Text } from '@/components/Text'
import type { PortalsAssets } from '@/pages/Markets/hooks/usePortalsAssetsQuery'

export type MixedAssetList = { type: 'group' | 'individual'; data: Asset[] }[]

export type AssetData = {
  assets: Asset[]
  groupedAssets?: MixedAssetList
  handleClick: (asset: Asset) => void
  handleLongPress?: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
  rowComponent?: FC<{ asset: Asset; index: number; data: AssetData }>
  isLoading?: boolean
  portalsAssets?: PortalsAssets
}

export type GroupedAssetData = {
  groupedAssets: Asset[][]
  handleClick: (asset: Asset) => void
  handleLongPress?: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
  rowComponent?: FC<{ asset: Asset; index: number; data: AssetData }>
  isLoading?: boolean
  portalsAssets?: PortalsAssets
  height?: string | number
}

type AssetListProps = AssetData & ListProps

const scrollbarStyle: CSSProperties = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
}

const INCREASE_VIEWPORT_BY = { top: 100, bottom: 100 } as const

export const AssetList: FC<AssetListProps> = ({
  assets,
  handleClick,
  handleLongPress,
  disableUnsupported = false,
  hideZeroBalanceAmounts = true,
  rowComponent = AssetRow,
  isLoading = false,
  portalsAssets,
  height = '50vh',
}) => {
  const mixedAssetList = useMemo(() => {
    const assetGroups = new Map<string, Asset[]>()

    assets.forEach(asset => {
      const groupKey = asset.relatedAssetKey || asset.assetId
      if (!assetGroups.has(groupKey)) {
        assetGroups.set(groupKey, [])
      }
      assetGroups.get(groupKey)?.push(asset)
    })

    const mixedList: { type: 'group' | 'individual'; data: Asset[] }[] = []

    assetGroups.forEach(groupAssets => {
      if (groupAssets.length > 1) {
        mixedList.push({ type: 'group', data: groupAssets })
      } else {
        mixedList.push({ type: 'individual', data: groupAssets })
      }
    })

    return mixedList
  }, [assets])

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
      groupedAssets: mixedAssetList,
      handleClick,
      handleLongPress,
      disableUnsupported,
      hideZeroBalanceAmounts,
      portalsAssets,
    }),
    [
      assets,
      mixedAssetList,
      disableUnsupported,
      handleClick,
      handleLongPress,
      hideZeroBalanceAmounts,
      portalsAssets,
    ],
  )

  const renderRow = useCallback(
    (index: number) => {
      const item = mixedAssetList[index]
      const RowComponent = rowComponent

      if (item.type === 'group') {
        return (
          <GroupedAssetRow
            assets={item.data}
            handleClick={handleClick}
            disableUnsupported={disableUnsupported}
            hideZeroBalanceAmounts={hideZeroBalanceAmounts}
          />
        )
      } else {
        const asset = item.data[0]
        return <RowComponent asset={asset} index={index} data={itemData} />
      }
    },
    [
      mixedAssetList,
      itemData,
      rowComponent,
      handleClick,
      disableUnsupported,
      hideZeroBalanceAmounts,
    ],
  )

  if (isLoading) {
    return (
      <Flex flexDir='column' width='100%' overflowY='auto' flex='1' minHeight={0} mt={4}>
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

  return (
    <Virtuoso
      data={mixedAssetList}
      itemContent={renderRow}
      style={virtuosoStyle}
      overscan={200}
      increaseViewportBy={INCREASE_VIEWPORT_BY}
    />
  )
}
