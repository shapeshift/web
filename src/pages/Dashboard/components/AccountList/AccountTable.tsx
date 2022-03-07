import { Stack, Stat, StatArrow, StatNumber, useColorModeValue } from '@chakra-ui/react'
import { range } from 'lodash'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { Column, Row } from 'react-table'
import { Allocations } from 'components/AccountRow/Allocations'
import { LoadingRow } from 'components/AccountRow/LoadingRow'
import { Amount } from 'components/Amount/Amount'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { AssetCell } from 'components/StakingVaults/Cells'
import { Text } from 'components/Text'
import {
  AccountRowData,
  selectPortfolioAccountRows,
  selectPortfolioLoading
} from 'state/slices/selectors'

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
        Cell: ({ row }: { row: RowProps }) => {
          const { assetId } = row.original
          const url = assetId ? `/assets/${assetId}` : ''
          const handleClick = () => {
            history.push(url)
          }
          return (
            <AssetCell
              assetId={row.original.assetId}
              subText={row.original.symbol}
              onClick={handleClick}
            />
          )
        }
      },
      {
        Header: () => <Text translation='dashboard.portfolio.balance' />,
        accessor: 'fiatAmount',
        id: 'balance',
        Cell: ({ value, row }: { value: string; row: RowProps }) => (
          <Stack spacing={0} fontWeight='medium'>
            <Amount.Fiat color={textColor} lineHeight='tall' value={value} />
            <Amount.Crypto
              lineHeight='shorter'
              fontWeight='normal'
              fontSize='xs'
              data-test={`account-row-asset-crypto-${row.original.symbol}`}
              value={row.original.cryptoAmount}
              symbol={row.original.symbol}
            />
          </Stack>
        )
      },
      {
        Header: () => <Text translation='dashboard.portfolio.price' />,
        accessor: 'price',
        isNumeric: true,
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value, row }: { value: string; row: RowProps }) => (
          <Stack spacing={0} fontWeight='medium'>
            <Amount.Fiat color={textColor} value={value} lineHeight='tall' />
            <Stat>
              <StatNumber
                fontSize='xs'
                display='flex'
                lineHeight='shorter'
                alignItems='center'
                color={row.original.priceChange > 0 ? 'green.500' : 'red.500'}
              >
                <Amount.Percent value={row.original.priceChange * 0.01} />
                <StatArrow
                  boxSize='10px'
                  ml={1}
                  type={row.original.priceChange > 0 ? 'increase' : 'decrease'}
                />
              </StatNumber>
            </Stat>
          </Stack>
        )
      },
      {
        Header: () => <Text textAlign='right' translation='dashboard.portfolio.allocation' />,
        justifyContent: 'flex-end',
        accessor: 'allocation',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value }: { value: number }) => <Allocations value={value} />
      }
    ],
    [history, textColor]
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
  return loading ? (
    loadingRows
  ) : (
    <ReactTable
      columns={columns}
      data={rowData}
      initialState={{ sortBy: [{ id: 'balance', desc: true }] }}
    />
  )
}
