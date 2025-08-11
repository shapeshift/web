import type { ListProps } from '@chakra-ui/react'
import { Center, Flex, Icon, Skeleton } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { range } from 'lodash'
import type { CSSProperties, FC } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { FaRegCompass } from 'react-icons/fa6'
import type { VerticalSize } from 'react-virtualized-auto-sizer'
import AutoSizer from 'react-virtualized-auto-sizer'
import type { ListChildComponentProps } from 'react-window'
import { FixedSizeList } from 'react-window'

import { AssetRow } from './AssetRow'

import { Text } from '@/components/Text'
import { useRefCallback } from '@/hooks/useRefCallback/useRefCallback'
import { useRouteAssetId } from '@/hooks/useRouteAssetId/useRouteAssetId'
import type { PortalsAssets } from '@/pages/Markets/hooks/usePortalsAssetsQuery'

export type AssetData = {
  assets: Asset[]
  handleClick: (asset: Asset) => void
  disableUnsupported?: boolean
  hideZeroBalanceAmounts?: boolean
  rowComponent?: FC<ListChildComponentProps<AssetData>>
  isLoading?: boolean
  portalsAssets?: PortalsAssets
}

type AssetListProps = AssetData & ListProps

const scrollbarStyle: CSSProperties = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
}

export const AssetList: FC<AssetListProps> = ({
  assets,
  handleClick,
  disableUnsupported = false,
  hideZeroBalanceAmounts = true,
  rowComponent = AssetRow,
  isLoading = false,
  portalsAssets,
}) => {
  const assetId = useRouteAssetId()
  const tokenListRef = useRef<FixedSizeList<AssetData> | null>(null)

  useRefCallback<FixedSizeList<AssetData>>({
    deps: [assetId],
    onInit: node => {
      if (!node) return
      tokenListRef.current = node
    },
  })

  useEffect(() => {
    if (!tokenListRef.current) return
    const parsedAssetId = assetId ? decodeURIComponent(assetId) : undefined
    const index = tokenListRef.current.props.itemData?.assets.findIndex(
      ({ assetId }: Asset) => assetId === parsedAssetId,
    )
    if (typeof index === 'number' && index >= 0) {
      tokenListRef.current.scrollToItem(index, 'center')
    }
  }, [assetId, assets])

  useEffect(() => {
    if (!tokenListRef.current) return
    tokenListRef.current.scrollTo(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets])

  const itemData = useMemo(
    () => ({
      assets,
      handleClick,
      disableUnsupported,
      hideZeroBalanceAmounts,
      portalsAssets,
    }),
    [assets, disableUnsupported, handleClick, hideZeroBalanceAmounts, portalsAssets],
  )

  const renderContent = useCallback(
    ({ height }: VerticalSize) => {
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
        <FixedSizeList
          itemSize={60}
          height={height}
          width='100%'
          itemData={itemData}
          itemCount={assets.length}
          ref={tokenListRef}
          className='token-list'
          overscanCount={1}
          style={scrollbarStyle}
        >
          {rowComponent}
        </FixedSizeList>
      )
    },
    [assets.length, itemData, rowComponent, isLoading],
  )

  return (
    <AutoSizer disableWidth className='auto-sizered'>
      {renderContent}
    </AutoSizer>
  )
}
