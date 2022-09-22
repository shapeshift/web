import { Stack, Stat, StatArrow, StatNumber, useColorModeValue } from '@chakra-ui/react'
import { range } from 'lodash'
import { useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import type { Column, Row } from 'react-table'
import { LoadingRow } from 'components/AccountRow/LoadingRow'
import { Amount } from 'components/Amount/Amount'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { AssetCell } from 'components/StakingVaults/Cells'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { AccountRowData } from 'state/slices/selectors'
import { selectPortfolioAccountRows, selectPortfolioLoading } from 'state/slices/selectors'

type RowProps = Row<AccountRowData>

export const AccountTable = () => {
  const loading = useSelector(selectPortfolioLoading)
  const rowData = useSelector(selectPortfolioAccountRows)
  const textColor = useColorModeValue('black', 'white')
  const history = useHistory()
  const columns: Column<AccountRowData>[] = useMemo(
    () => [
      {
        Header: () => <Text translation='dashboard.portfolio.asset' />,
        accessor: 'assetId',
        disableSortBy: true,
        Cell: ({ row }: { row: RowProps }) => (
          <AssetCell assetId={row.original.assetId} subText={row.original.symbol} />
        ),
      },
      {
        Header: () => <Text translation='dashboard.portfolio.balance' />,
        accessor: 'fiatAmount',
        id: 'balance',
        justifyContent: { base: 'flex-end', lg: 'flex-start' },
        Cell: ({ value, row }: { value: string; row: RowProps }) => (
          <Stack spacing={0} fontWeight='medium' textAlign={{ base: 'right', lg: 'left' }}>
            <Amount.Fiat color={textColor} lineHeight='tall' value={value} />
            <Amount.Crypto
              lineHeight='shorter'
              fontWeight='normal'
              fontSize='sm'
              data-test={`account-row-asset-crypto-${row.original.symbol}`}
              value={row.original.cryptoAmount}
              symbol={row.original.symbol}
            />
          </Stack>
        ),
      },
      {
        Header: () => <Text translation='dashboard.portfolio.price' />,
        accessor: 'price',
        isNumeric: true,
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value }: { value: string }) => (
          <Amount.Fiat color={textColor} value={value} lineHeight='tall' />
        ),
      },
      {
        Header: () => <Text translation='dashboard.portfolio.priceChange' />,
        accessor: 'priceChange',
        display: { base: 'none', lg: 'table-cell' },
        sortType: (a: RowProps, b: RowProps): number =>
          bnOrZero(a.original.priceChange).gt(bnOrZero(b.original.priceChange)) ? 1 : -1,
        Cell: ({ value }: { value: number }) => (
          <Stat>
            <StatNumber
              fontSize='md'
              display='flex'
              lineHeight='shorter'
              alignItems='center'
              color={value > 0 ? 'green.500' : 'red.500'}
            >
              <StatArrow ml={1} type={value > 0 ? 'increase' : 'decrease'} />
              <Amount.Percent value={value * 0.01} />
            </StatNumber>
          </Stat>
        ),
      },
      {
        Header: () => <Text textAlign='right' translation='dashboard.portfolio.allocation' />,
        accessor: 'allocation',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value }: { value: number }) => (
          <Amount.Percent fontWeight='medium' textColor='gray.500' value={value * 0.01} />
        ),
        sortType: (a: RowProps, b: RowProps): number =>
          bnOrZero(a.original.allocation).gt(bnOrZero(b.original.allocation)) ? 1 : -1,
      },
    ],
    [textColor],
  )
  const loadingRows = useMemo(() => {
    return (
      <Stack>
        {range(5).map(index => (
          <LoadingRow key={index} />
        ))}
      </Stack>
    )
  }, [])

  const handleRowClick = useCallback(
    (row: Row<AccountRowData>) => {
      const { assetId } = row.original
      const url = assetId ? `/assets/${assetId}` : ''
      history.push(url)
    },
    [history],
  )

  return loading ? (
    loadingRows
  ) : (
    <ReactTable
      columns={columns}
      data={rowData}
      initialState={{ sortBy: [{ id: 'balance', desc: true }] }}
      onRowClick={handleRowClick}
    />
  )
}
