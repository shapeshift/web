import { Box, Button, Heading } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { AssetCell } from 'components/StakingVaults/Cells'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useFetchFiatAssetMarketData } from 'state/apis/fiatRamps/hooks'
import { selectFiatRampBuyAssetsWithMarketData } from 'state/apis/fiatRamps/selectors'

import { PageContainer } from './components/PageContainer'
import { SparkLine } from './components/Sparkline'

type AssetWithMarketData = ReturnType<typeof selectFiatRampBuyAssetsWithMarketData>[0]
type RowProps = Row<AssetWithMarketData>

const pageContainerPaddingTop = { base: 8, md: '5rem' }
const headingPaddingX = { base: 2, xl: 4 }
const reactTableInitialState = { sortBy: [{ id: 'marketCap', desc: true }] }

export const TopAssets: React.FC = () => {
  const fiatRamps = useModal('fiatRamps')
  const translate = useTranslate()
  const fiatRampBuyAssetsWithMarketData = useSelector(selectFiatRampBuyAssetsWithMarketData)

  useFetchFiatAssetMarketData()

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

  const handleClick = useCallback(
    (row: RowProps) =>
      fiatRamps.open({ assetId: row.original.assetId, fiatRampAction: FiatRampAction.Buy }),
    [fiatRamps],
  )

  return (
    <Box>
      <PageContainer
        maxWidth='6xl'
        flexDir='column'
        gap={4}
        display='flex'
        py='5rem'
        pt={pageContainerPaddingTop}
      >
        <Heading as='h4' px={headingPaddingX}>
          {translate('buyPage.availableAssets')}
        </Heading>
        <ReactTable
          columns={columns}
          data={fiatRampBuyAssetsWithMarketData}
          initialState={reactTableInitialState}
          onRowClick={handleClick}
          rowDataTestKey='name'
          rowDataTestPrefix='fiat-ramp'
        />
      </PageContainer>
    </Box>
  )
}
