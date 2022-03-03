import { Tag } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useMemo } from 'react'
import { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'

import { AssetCell } from './Cells'

type StakingTableProps = {
  data: EarnOpportunityType[]
  onClick: (arg: EarnOpportunityType) => void
  showTeaser?: boolean
}

type RowProps = Row<EarnOpportunityType>

export const StakingTable = ({ data, onClick, showTeaser }: StakingTableProps) => {
  const columns: Column<EarnOpportunityType>[] = useMemo(
    () => [
      {
        Header: '#',
        Cell: ({ row, flatRows }: { row: RowProps; flatRows: any }) => (
          <RawText>{flatRows.indexOf(row) + 1}</RawText>
        )
      },
      {
        Header: 'Asset',
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => (
          <AssetCell
            assetId={row.original.assetId}
            provider={row.original.provider}
            showTeaser={showTeaser}
            version={row.original.version}
            onClick={() => onClick(row.original)}
          />
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
        Cell: ({ value, row }: { value: string; row: RowProps }) => (
          <Tag colorScheme={row.original.expired ? 'red' : 'green'}>
            <Amount.Percent value={value} />
          </Tag>
        ),
        sortType: (a: RowProps, b: RowProps): number =>
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
    // React-tables requires the use of a useMemo
    // but we do not want it to recompute the values onClick
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showTeaser]
  )

  return <ReactTable data={data} columns={columns} />
}
