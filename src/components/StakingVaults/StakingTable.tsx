import { Skeleton, Tag } from '@chakra-ui/react'
import type { EarnOpportunityType } from 'features/defi/helpers/normalizeOpportunity'
import { useCallback, useMemo } from 'react'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { AssetCell } from './Cells'
import { makeProviderName } from './utils'

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
            <AssetCell
              assetId={row.original.assetId}
              subText={makeProviderName(row.original.provider)}
              icons={row.original.icons}
              opportunityName={row.original.opportunityName}
              showTeaser={showTeaser}
              showAssetSymbol={row.original.showAssetSymbol}
              postFix={row.original.version && `(${row.original.version})`}
            />
          </Skeleton>
        ),
        disableSortBy: true,
      },
      {
        Header: 'Type',
        accessor: 'type',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value, row }: { value: string | undefined; row: RowProps }) => (
          <Skeleton isLoaded={row.original.isLoaded}>
            <Tag textTransform='capitalize' size={{ base: 'sm', md: 'md' }}>
              {value?.replace('_', ' ')}
            </Tag>
          </Skeleton>
        ),
      },
      {
        Header: 'APY',
        accessor: 'apy',
        isNumeric: true,
        Cell: ({ value, row }: { value: string | number | undefined; row: RowProps }) => (
          <Skeleton isLoaded={row.original.isLoaded}>
            <Tag size={{ base: 'sm', md: 'md' }} colorScheme='green'>
              <Amount.Percent autoColor value={value ?? ''} />
            </Tag>
          </Skeleton>
        ),
        sortType: (a: RowProps, b: RowProps): number =>
          bnOrZero(a.original.apy).gt(bnOrZero(b.original.apy)) ? -1 : 1,
      },
      {
        Header: 'TVL',
        accessor: 'tvl',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value, row }: { value: string; row: RowProps }) => (
          <Skeleton isLoaded={row.original.isLoaded}>
            <Amount.Fiat value={value} />
          </Skeleton>
        ),
      },
      {
        Header: 'Balance',
        accessor: 'fiatAmount',
        Cell: ({ value, row }: { value: string; row: RowProps }) => (
          <Skeleton isLoaded={row.original.isLoaded}>
            {bnOrZero(value).gt(0) ? (
              <Amount.Fiat
                value={value}
                color={row.original.expired ? 'yellow.500' : 'green.500'}
              />
            ) : (
              <RawText>-</RawText>
            )}
          </Skeleton>
        ),
      },
    ],
    [showTeaser],
  )

  const handleRowClick = useCallback(
    (row: Row<EarnOpportunityType>) => onClick(row.original),
    [onClick],
  )

  return <ReactTable data={data} columns={columns} onRowClick={handleRowClick} />
}
