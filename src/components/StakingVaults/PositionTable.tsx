import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, IconButton, Tag } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { PositionDetails } from 'components/EarnDashboard/components/PositionDetails'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'
import type { GroupedEligibleOpportunityReturnType } from 'state/slices/opportunitiesSlice/types'
import { selectAggregatedEarnOpportunitiesByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type RowProps = Row<GroupedEligibleOpportunityReturnType>

export const PositionTable = () => {
  const translate = useTranslate()
  const positions = useAppSelector(selectAggregatedEarnOpportunitiesByAssetId)

  const columns: Column<GroupedEligibleOpportunityReturnType>[] = useMemo(
    () => [
      {
        Header: '#',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ row, flatRows }: { row: RowProps; flatRows: any }) => (
          <RawText>{flatRows.indexOf(row) + 1}</RawText>
        ),
      },
      {
        Header: translate('defi.asset'),
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => (
          <Flex>
            <Flex>
              <AssetIcon size='sm' assetId={row.original.assetId} />
            </Flex>
          </Flex>
        ),
        disableSortBy: true,
      },
      {
        Header: 'Total Value',
        accessor: 'balance',
        Cell: ({ row }: { row: RowProps }) => <Amount.Fiat value={row.original.balance} />,
      },
      {
        Header: 'Net APY',
        accessor: 'netApy',
        Cell: ({ row }: { row: RowProps }) => (
          <Tag colorScheme='green'>
            <Amount.Percent value={row.original.netApy} />
          </Tag>
        ),
      },
      {
        Header: 'Claimable Rewards',
        accessor: 'rewards',
        Cell: ({ row }: { row: RowProps }) => <Amount.Fiat value={row.original.rewards} />,
      },
      {
        Header: () => null,
        id: 'expander',
        textAlign: 'right',
        Cell: ({ row }: { row: RowProps }) => (
          <Flex justifyContent='flex-end' width='full'>
            <IconButton
              variant='ghost'
              size='md'
              aria-label='Exapnd Row'
              isActive={row.isExpanded}
              icon={row.isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
              {...row.getToggleRowExpandedProps()}
            />
          </Flex>
        ),
      },
    ],
    [translate],
  )
  return <ReactTable data={positions} columns={columns} renderSubComponent={PositionDetails} />
}
