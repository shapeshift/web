import { Flex, Stack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { Row } from 'react-table'
import { useLongPress } from 'use-long-press'

import { AssetCell } from '@/components/StakingVaults/Cells'
import { defaultLongPressConfig } from '@/constants/longPress'
import { vibrate } from '@/lib/vibrate'
import { selectRelatedAssetIdsInclusiveSorted } from '@/state/slices/related-assets-selectors'
import { selectAssets } from '@/state/slices/selectors'
import { useSelectorWithArgs } from '@/state/store'

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
  row: Row<Asset>
  onRowClick: (asset: Asset) => void
  onRowLongPress?: (asset: Asset) => void
}

export const GroupedAssets = memo<GroupedAssetsProps>(({ row, onRowClick, onRowLongPress }) => {
  const asset = row.original as Asset

  const relatedAssetIdsFilter = useMemo(
    () => ({
      assetId: asset.assetId,
      // We want all related assetIds, and conditionally mark the disconnected/unsupported ones as
      // disabled in the UI. This allows users to see our product supports more assets than they
      // have connected chains for.
      onlyConnectedChains: false,
    }),
    [asset],
  )
  const relatedAssetIds = useSelectorWithArgs(
    selectRelatedAssetIdsInclusiveSorted,
    relatedAssetIdsFilter,
  )

  console.log({
    relatedAssetIds,
  })

  if (relatedAssetIds.length === 0) return null

  return (
    <Stack spacing={2} p={4} bg='background.surface.raised.base'>
      {relatedAssetIds.map(assetId => (
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
