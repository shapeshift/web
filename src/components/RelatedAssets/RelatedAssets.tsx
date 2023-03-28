import type { AssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useHistory } from 'react-router-dom'
import type { Column, Row } from 'react-table'
import { Card } from 'components/Card/Card'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { AssetCell } from 'components/StakingVaults/Cells'
import { Text } from 'components/Text'
import { useGetRelatedAssetIdsQuery } from 'state/apis/zerion/zerionApi'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type RelatedAssetsProps = {
  assetId: AssetId
}

export const RelatedAssets: React.FC<RelatedAssetsProps> = ({ assetId }) => {
  const { data, isLoading } = useGetRelatedAssetIdsQuery(assetId)
  const assets = useAppSelector(selectAssets)
  const history = useHistory()

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
      history.push(`/assets/${assetId}`)
    },
    [history],
  )

  if (isLoading) return null
  if (!data?.length) return null

  return (
    <Card>
      <Card.Header>
        <Card.Heading>
          <Text translation='assets.assetCards.relatedAssets' />
        </Card.Heading>
      </Card.Header>
      <Card.Body px={2} pt={0}>
        <ReactTable columns={columns} data={data ?? []} onRowClick={handleRowClick} />
      </Card.Body>
    </Card>
  )
}
