import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Avatar, Flex, IconButton, Tag } from '@chakra-ui/react'
import type { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { DefiProviderMetadata } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { ProviderDetails } from 'components/EarnDashboard/components/ProviderDetails/ProviderDetails'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { AggregatedOpportunitiesByProviderReturn } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnOpportunitiesByProvider,
  selectOpportunityApiPending,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ResultsEmpty } from './ResultsEmpty'
import { SearchEmpty } from './SearchEmpty'

export type RowProps = Row<AggregatedOpportunitiesByProviderReturn>

type ProviderCellProps = {
  provider: DefiProvider
}

const ProviderCell: React.FC<ProviderCellProps> = ({ provider }) => {
  const { icon, type } = DefiProviderMetadata[provider]
  return (
    <Flex alignItems='center' gap={4}>
      <Avatar size='sm' src={icon} />
      <Flex flexDir='column'>
        <RawText>{type}</RawText>
      </Flex>
    </Flex>
  )
}

export type ProviderTableProps = {
  searchQuery: string
  includeEarnBalances?: boolean
  includeRewardsBalances?: boolean
}

export const ProviderTable: React.FC<ProviderTableProps> = ({
  includeEarnBalances,
  includeRewardsBalances,
  searchQuery,
}) => {
  const translate = useTranslate()
  const isLoading = useAppSelector(selectOpportunityApiPending)
  const providers = useAppSelector(state =>
    selectAggregatedEarnOpportunitiesByProvider(state, {
      includeEarnBalances,
      includeRewardsBalances,
    }),
  )

  const columns: Column<AggregatedOpportunitiesByProviderReturn>[] = useMemo(
    () => [
      {
        Header: '#',
        Cell: ({ row, flatRows }: { row: RowProps; flatRows: any }) => (
          <RawText>{flatRows.indexOf(row) + 1}</RawText>
        ),
      },
      {
        Header: translate('defi.provider'),
        accessor: 'provider',
        Cell: ({ row }: { row: RowProps }) => <ProviderCell provider={row.original.provider} />,
        disableSortBy: true,
      },
      {
        Header: translate('defi.totalValue'),
        id: 'fiatAmount',
        accessor: 'fiatAmount',
        Cell: ({ row }: { row: RowProps }) => {
          const hasValue = bnOrZero(row.original.fiatAmount).gt(0)
          return hasValue ? (
            <Amount.Fiat value={row.original.fiatAmount} />
          ) : (
            <RawText variant='sub-text'>-</RawText>
          )
        },
      },
      {
        Header: translate('defi.netApy'),
        accessor: 'netApy',
        textAlign: 'right',
        Cell: ({ row }: { row: RowProps }) => (
          <Flex justifyContent={{ base: 'flex-end', md: 'flex-start' }}>
            <Tag colorScheme='green' size={{ base: 'sm', md: 'md' }}>
              <Amount.Percent value={row.original.netApy} />
            </Tag>
          </Flex>
        ),
      },
      {
        Header: translate('defi.claimableRewards'),
        accessor: 'fiatRewardsAmount',
        display: { base: 'none', md: 'table-cell' },
        Cell: ({ row }: { row: RowProps }) => {
          const hasRewards = bnOrZero(row.original.fiatRewardsAmount).gt(0)
          return hasRewards ? (
            <Amount.Fiat value={row.original.fiatRewardsAmount} />
          ) : (
            <RawText variant='sub-text'>-</RawText>
          )
        },
      },
      {
        Header: () => null,
        id: 'expander',
        textAlign: 'right',
        display: { base: 'none', md: 'table-cell' },
        Cell: ({ row }: { row: RowProps }) => (
          <Flex justifyContent='flex-end' width='full'>
            <IconButton
              variant='ghost'
              size='md'
              aria-label='Exapnd Row'
              isActive={row.isExpanded}
              icon={row.isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
            />
          </Flex>
        ),
      },
    ],
    [translate],
  )

  const filterRowsBySearchTerm = useCallback(
    (rows: AggregatedOpportunitiesByProviderReturn[], filterValue: any) => {
      if (!filterValue) return rows
      if (typeof filterValue !== 'string') {
        return []
      }
      const search = filterValue.trim().toLowerCase()
      const results = matchSorter(rows, search, { keys: ['provider'] })
      return results
    },
    [],
  )

  const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])

  const rows = useMemo(() => {
    return isSearching ? filterRowsBySearchTerm(providers, searchQuery) : providers
  }, [filterRowsBySearchTerm, providers, searchQuery, isSearching])

  return (
    <ReactTable
      onRowClick={row => row.toggleRowExpanded()}
      data={rows}
      columns={columns}
      isLoading={isLoading}
      renderSubComponent={({ original }) => (
        <ProviderDetails key={original.provider} {...original} />
      )}
      renderEmptyComponent={() =>
        searchQuery ? <SearchEmpty searchQuery={searchQuery} /> : <ResultsEmpty />
      }
      initialState={{ sortBy: [{ id: 'fiatAmount', desc: true }], pageSize: 30 }}
    />
  )
}
