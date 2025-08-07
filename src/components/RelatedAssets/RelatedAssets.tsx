import { Card, CardBody, CardHeader, Heading } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Column, Row } from 'react-table'

import { ReactTable } from '@/components/ReactTable/ReactTable'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { selectRelatedAssetIds } from '@/state/slices/related-assets-selectors'
import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type RelatedAssetsProps = {
  assetId: AssetId
}

export const RelatedAssets: React.FC<RelatedAssetsProps> = ({ assetId }) => {
  const relatedAssetIdsFilter = useMemo(() => ({ assetId }), [assetId])
  const relatedAssetIds = useAppSelector(state =>
    selectRelatedAssetIds(state, relatedAssetIdsFilter),
  )
  const assetActionsDrawer = useModal('assetActionsDrawer')
  const assets = useAppSelector(selectAssets)
  const navigate = useNavigate()

  const columns: Column<AssetId>[] = useMemo(
    () => [
      {
        Header: () => <Text translation='dashboard.portfolio.asset' />,
        accessor: '_type',
        disableSortBy: true,
        Cell: ({ row }: { row: Row<AssetId> }) => {
          const assetId = row.original
          const asset = assets[assetId]
          if (!asset) return null
          const { symbol } = asset
          return <AssetCell assetId={assetId} subText={symbol} />
        },
      },
    ],
    [assets],
  )

  const handleRowClick = useCallback(
    (row: Row<AssetId>) => {
      const assetId = row.original
      navigate(`/assets/${assetId}`)
    },
    [navigate],
  )

  const handleRowLongPress = useCallback(
    (row: Row<AssetId>) => {
      const assetId = row.original
      assetActionsDrawer.open({ assetId })
    },
    [assetActionsDrawer],
  )

  if (!relatedAssetIds.length) return null

  return (
    <Card variant='dashboard'>
      <CardHeader>
        <Heading as='h5'>
          <Text translation='assets.assetCards.relatedAssets' />
        </Heading>
      </CardHeader>
      <CardBody px={2} pt={0}>
        <ReactTable
          columns={columns}
          data={relatedAssetIds}
          onRowClick={handleRowClick}
          onRowLongPress={handleRowLongPress}
          variant='clickable'
        />
      </CardBody>
    </Card>
  )
}
