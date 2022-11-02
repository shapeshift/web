import { Skeleton } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { Column, Row } from 'react-table'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'

import { AssetCell } from './Cells'

type RowProps = Row<any>

export const LeaderboardTable = () => {
  const mockData = [
    {
      burned: '420',
      geckoId: 'ripple',
      isLoaded: true,
    },
    {
      burned: '100',
      geckoId: 'binancecoin',
      isLoaded: true,
    },
    {
      burned: '69',
      geckoId: 'cardano',
      isLoaded: true,
    },
  ]
  const columns: Column<any>[] = useMemo(() => {
    return [
      {
        Header: '#',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ row, flatRows }: { row: RowProps; flatRows: any }) => (
          <RawText>{flatRows.indexOf(row) + 1}</RawText>
        ),
      },
      {
        Header: 'Asset',
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => (
          <Skeleton isLoaded={row.original.isLoaded}>
            <AssetCell geckoId={row.original.geckoId} />
          </Skeleton>
        ),
        disableSortBy: true,
      },
      {
        Header: 'Tokens Burned',
        accessor: 'burned',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value, row }: { value: string | undefined; row: RowProps }) => (
          <Skeleton isLoaded={row.original.isLoaded}>
            <RawText>{`${value}`}</RawText>
          </Skeleton>
        ),
      },
    ]
  }, [])

  return <ReactTable data={mockData} columns={columns} />
}
