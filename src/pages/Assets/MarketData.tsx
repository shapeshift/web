import { Button, Stack } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { ReactTable } from 'components/ReactTable/ReactTable'
import type { RowProps } from 'components/Row/Row'
import { AssetCell } from 'components/StakingVaults/Cells'
import { Text } from 'components/Text'
import { SparkLine } from 'pages/Buy/components/Sparkline'
import { selectFiatRampBuyAssetsWithMarketData } from 'state/apis/fiatRamps/selectors'

type AssetWithMarketData = ReturnType<typeof selectFiatRampBuyAssetsWithMarketData>[0]
type RowProps = Row<AssetWithMarketData>

export const MarketData = () => {
  const assets = useSelector(selectFiatRampBuyAssetsWithMarketData)
  const columns: Column<AssetWithMarketData>[] = useMemo(
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
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ row }: { row: RowProps }) => <Amount.Fiat value={row.original.marketCap} />,
      },
      {
        Header: () => <Text translation='dashboard.portfolio.sparkLine' />,
        accessor: 'name',
        disableSortBy: true,
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ row }: { row: RowProps }) => (
          <SparkLine
            percentChange={row.original.changePercent24Hr}
            assetId={row.original.assetId}
          />
        ),
      },
      {
        Header: () => <></>,
        accessor: 'maxSupply',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ row }: { row: RowProps }) => (
          <Button data-test={`${row.original.name}-buy-button`}>
            <Text translation='fiatRamps.buy' />
          </Button>
        ),
      },
    ],
    [],
  )
  return (
    <Stack>
      <ReactTable data={assets} columns={columns} />
    </Stack>
  )
}
