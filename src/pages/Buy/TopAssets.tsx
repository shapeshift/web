import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { AssetCell } from 'components/StakingVaults/Cells'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectFiatRampBuyAssetsWithMarketData } from 'state/apis/fiatRamps/selectors'

import { PageContainer } from './components/PageContainer'

type AssetWithMarketData = ReturnType<typeof selectFiatRampBuyAssetsWithMarketData>[0]
type RowProps = Row<AssetWithMarketData>

export const TopAssets = () => {
  const fiatRampBuyAssetsWithMarketData = useSelector(selectFiatRampBuyAssetsWithMarketData)

  const columns: Column<any>[] = useMemo(
    () => [
      {
        Header: () => <Text translation='dashboard.portfolio.asset' />,
        accessor: 'assetId',
        disableSortBy: true,
        Cell: ({ row }: { row: RowProps }) => <AssetCell assetId={row.original.assetId} />,
      },
      {
        Header: () => <Text translation='dashboard.portfolio.price' />,
        accessor: 'price',
        Cell: ({ row }: { row: RowProps }) => (
          <Amount.Fiat color='var(--chakra-colors-chakra-body-text)' value={row.original.price} />
        ),
      },
      {
        Header: () => <Text translation='dashboard.portfolio.priceChange' />,
        accessor: 'changePercent24Hr',
        Cell: ({ row }: { row: RowProps }) => (
          <Amount.Percent
            autoColor
            value={bnOrZero(row.original.changePercent24Hr).times(0.01).toString()}
          />
        ),
      },
      {
        Header: () => <Text translation='dashboard.portfolio.marketCap' />,
        accessor: 'marketCap',
        Cell: ({ row }: { row: RowProps }) => <Amount.Fiat value={row.original.marketCap} />,
      },
    ],
    [],
  )
  return (
    <PageContainer>
      <ReactTable
        columns={columns}
        data={fiatRampBuyAssetsWithMarketData}
        initialState={{ sortBy: [{ id: 'marketCap', desc: true }] }}
        onRowClick={() => console.info('click')}
      />
    </PageContainer>
  )
}
