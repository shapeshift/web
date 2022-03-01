import { Tag } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { Column } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'

import { AssetCell } from './Cells'

type StakingTableProps = {
  data: any[]
  onClick: (arg: any) => void
}

export const StakingTable = ({ data, onClick }: StakingTableProps) => {
  const columns: Column[] = useMemo(
    () => [
      {
        Header: '#',
        Cell: ({ row, flatRows }: { row: any; flatRows: any }) => (
          <RawText>{flatRows.indexOf(row) + 1}</RawText>
        )
      },
      {
        Header: 'Asset',
        accessor: 'assetId',
        Cell: ({ row }: { row: any }) => (
          <AssetCell assetId={row.original.assetId} provider={row.original.provider} />
        ),
        disableSortBy: true
      },
      {
        Header: 'Type',
        accessor: 'type',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value }: { value: string }) => <Tag textTransform='capitalize'>{value}</Tag>
      },
      {
        Header: 'APY',
        accessor: 'apy',
        isNumeric: true,
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value, row }: { value: string; row: any }) => (
          <Tag colorScheme={row.original.expired ? 'red' : 'green'}>
            <Amount.Percent value={value} />
          </Tag>
        ),
        sortType: (a: any, b: any) =>
          bnOrZero(a.original.apy).gt(bnOrZero(b.original.apy)) ? -1 : 1
      },
      {
        Header: 'TVL',
        accessor: 'tvl',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value }: { value: string }) => <Amount.Fiat value={value} />
      },
      {
        Header: 'Balance',
        accessor: 'fiatAmount',
        Cell: ({ value }: { value: string }) =>
          bnOrZero(value).gt(0) ? (
            <Amount.Fiat value={value} color='green.500' />
          ) : (
            <RawText>-</RawText>
          )
      }
    ],
    []
  )

  return <ReactTable onClick={onClick} data={data} columns={columns} />
}
