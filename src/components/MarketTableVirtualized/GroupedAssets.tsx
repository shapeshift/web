import { Flex, Stack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback } from 'react'
import { useSelector } from 'react-redux'
import type { Row } from 'react-table'
import { useLongPress } from 'use-long-press'

import { AssetCell } from '@/components/StakingVaults/Cells'
import { defaultLongPressConfig } from '@/constants/longPress'
import { vibrate } from '@/lib/vibrate'
import type { AccountRowData } from '@/state/slices/selectors'
import { selectAssets, selectGroupedAssetsWithBalances } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type RelatedAssetRowProps = {
  asset: AccountRowData
  onRowClick: (asset: Asset) => void
  onRowLongPress?: (asset: Asset) => void
}

const relatedAssetRowHoverStyles = {
  bg: 'background.surface.raised.base',
}

const RelatedAssetRow = memo<RelatedAssetRowProps>(({ asset, onRowClick, onRowLongPress }) => {
  const assets = useSelector(selectAssets)
  const relatedAsset = assets[asset.assetId]

  const handleClick = useCallback(() => {
    if (!relatedAsset) return
    vibrate('heavy')
    onRowClick(relatedAsset)
  }, [relatedAsset, onRowClick])

  const longPressHandlers = useLongPress((_, { context: asset }) => {
    onRowLongPress?.(asset as Asset)
  }, defaultLongPressConfig)

  if (!asset) return null

  return (
    <Flex
      justify='space-between'
      align='center'
      p={2}
      borderRadius='md'
      cursor='pointer'
      onClick={handleClick}
      _hover={relatedAssetRowHoverStyles}
      {...longPressHandlers(asset)}
    >
      <Flex align='center' gap={3} width='100%'>
        <AssetCell assetId={asset.assetId} />
      </Flex>
    </Flex>
  )
})

type GroupedAssetsProps = {
  row: Row<Asset>
  onRowClick: (asset: Asset) => void
  onRowLongPress?: (asset: Asset) => void
}

export const GroupedAssets = memo<GroupedAssetsProps>(({ row, onRowClick, onRowLongPress }) => {
  const asset = row.original
  const groupedAssetWithBalances = useAppSelector(state =>
    selectGroupedAssetsWithBalances(state, asset.assetId),
  )

  if (groupedAssetWithBalances?.relatedAssets.length === 1) return null

  return (
    <Stack spacing={2} p={4} bg='background.surface.raised.base'>
      {groupedAssetWithBalances?.relatedAssets.map(asset => (
        <RelatedAssetRow
          key={asset.assetId}
          asset={asset}
          onRowClick={onRowClick}
          onRowLongPress={onRowLongPress}
        />
      ))}
    </Stack>
  )
})
