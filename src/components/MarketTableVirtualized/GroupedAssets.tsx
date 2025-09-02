import { Flex, Stack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { Row } from 'react-table'
import { useLongPress } from 'use-long-press'

import { AssetCell } from '@/components/StakingVaults/Cells'
import { defaultLongPressConfig } from '@/constants/longPress'
import { vibrate } from '@/lib/vibrate'
import { selectAssets, selectPortfolioAccountRows } from '@/state/slices/selectors'

export type AssetWithRelatedAssetIds = Asset & {
  isGrouped?: boolean
  relatedAssetIds?: string[]
}

type RelatedAssetRowProps = {
  assetId: string
  onRowClick: (asset: Asset) => void
  onRowLongPress?: (asset: Asset) => void
}

const relatedAssetRowHoverStyles = {
  bg: 'background.surface.raised.base',
}

const RelatedAssetRow = memo<RelatedAssetRowProps>(({ assetId, onRowClick, onRowLongPress }) => {
  const assets = useSelector(selectAssets)
  const asset = assets[assetId]

  const handleClick = useCallback(() => {
    if (!asset) return
    vibrate('heavy')
    onRowClick(asset)
  }, [asset, onRowClick])

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
  row: Row<AssetWithRelatedAssetIds>
  onRowClick: (asset: Asset) => void
  onRowLongPress?: (asset: Asset) => void
}

export const GroupedAssets = memo<GroupedAssetsProps>(({ row, onRowClick, onRowLongPress }) => {
  const groupedRow = row.original as AssetWithRelatedAssetIds
  const rowData = useSelector(selectPortfolioAccountRows)

  const sortedAssetIds = useMemo(() => {
    if (!groupedRow.relatedAssetIds) return []

    return [...groupedRow.relatedAssetIds].sort((a, b) => {
      const aRow = rowData.find(r => r.assetId === a)
      const bRow = rowData.find(r => r.assetId === b)

      if (!aRow || !bRow) return 0

      return Number(bRow.fiatAmount) - Number(aRow.fiatAmount)
    })
  }, [groupedRow.relatedAssetIds, rowData])

  if (!groupedRow.isGrouped || !groupedRow.relatedAssetIds) return null

  return (
    <Stack spacing={2} p={4} bg='background.surface.raised.base'>
      {sortedAssetIds.map(assetId => (
        <RelatedAssetRow
          key={assetId}
          assetId={assetId}
          onRowClick={onRowClick}
          onRowLongPress={onRowLongPress}
        />
      ))}
    </Stack>
  )
})
