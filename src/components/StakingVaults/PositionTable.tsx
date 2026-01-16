import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Box, Flex, IconButton, Spinner, Tag, useMediaQuery } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Column, Row } from 'react-table'

import type { YieldAggregatedOpportunity } from './hooks/useYieldAsOpportunities'
import { SearchEmpty } from './SearchEmpty'

import { Amount } from '@/components/Amount/Amount'
import { PositionDetails } from '@/components/EarnDashboard/components/PositionDetails/PositionDetails'
import { DefiIcon } from '@/components/Icons/DeFi'
import { ReactTable } from '@/components/ReactTable/ReactTable'
import { ResultsEmpty } from '@/components/ResultsEmpty'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { RawText } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { isEvmAddress } from '@/lib/utils/isEvmAddress'
import type { AggregatedOpportunitiesByAssetIdReturn } from '@/state/slices/opportunitiesSlice/types'
import { selectAssetsSortedByMarketCap } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

export type UnifiedOpportunity = AggregatedOpportunitiesByAssetIdReturn &
  Partial<YieldAggregatedOpportunity>
export type RowProps = Row<UnifiedOpportunity>

const cellFlexJustifyContent = { base: 'flex-end', md: 'flex-start' }
const cellTagSize = { base: 'sm', md: 'md' }
const initialState = { pageSize: 30 }

export type PositionTableProps = {
  chainId?: ChainId
  searchQuery: string
  forceCompactView?: boolean
  data?: UnifiedOpportunity[]
  isLoading?: boolean
}

const emptyIcon = <DefiIcon boxSize='20px' color='blue.500' />

export const PositionTable: React.FC<PositionTableProps> = ({
  chainId,
  searchQuery,
  data,
  isLoading = false,
  forceCompactView = false,
}) => {
  'use no memo'
  const translate = useTranslate()
  const assets = useAppSelector(selectAssetsSortedByMarketCap)
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  const isCompactCols = !isLargerThanMd || forceCompactView

  const basePositions = useMemo(() => data ?? [], [data])

  const filteredByChain = useMemo(() => {
    if (!chainId) return basePositions
    return basePositions.filter(position => fromAssetId(position.assetId).chainId === chainId)
  }, [basePositions, chainId])

  const [processedRows, setProcessedRows] = useState<UnifiedOpportunity[]>([])
  const [, startTransition] = useTransition()

  const filterRowsBySearchTerm = useCallback(
    (rows: UnifiedOpportunity[], filterValue: string) => {
      if (!filterValue) return rows
      const search = filterValue.trim().toLowerCase()
      if (!search) return rows

      if (isEvmAddress(search)) {
        return rows.filter(row => fromAssetId(row.assetId).assetReference.toLowerCase() === search)
      }

      return matchSorter(rows, search, {
        keys: [
          row => assets.find(a => a.assetId === row.assetId)?.name ?? '',
          row => assets.find(a => a.assetId === row.assetId)?.symbol ?? '',
          row => (row.searchable ?? []).join(' '),
        ],
        threshold: matchSorter.rankings.CONTAINS,
      })
    },
    [assets],
  )

  const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])

  useEffect(() => {
    startTransition(() => {
      const targetRows = isSearching
        ? filterRowsBySearchTerm(filteredByChain, searchQuery)
        : filteredByChain
      setProcessedRows(targetRows)
    })
  }, [filteredByChain, filterRowsBySearchTerm, isSearching, searchQuery])

  const columns: Column<UnifiedOpportunity>[] = useMemo(
    () => [
      {
        Header: '#',
        display: isCompactCols ? 'none' : undefined,
        Cell: ({ row, flatRows }: { row: RowProps; flatRows: any }) => (
          <RawText>{flatRows.indexOf(row) + 1}</RawText>
        ),
      },
      {
        Header: translate('defi.asset'),
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => {
          const asset = assets.find(a => a.assetId === row.original.assetId)
          return <AssetCell assetId={row.original.assetId} subText={asset?.symbol} />
        },
        disableSortBy: true,
      },
      {
        Header: translate('defi.totalValue'),
        accessor: 'fiatAmount',
        Cell: ({ row }: { row: RowProps }) => {
          const hasValue =
            bnOrZero(row.original.fiatAmount).gt(0) ||
            bnOrZero(row.original.fiatRewardsAmount).gt(0)
          const totalFiatAmount = bnOrZero(row.original.fiatAmount).toFixed(2)
          return hasValue ? (
            <Amount.Fiat value={totalFiatAmount} />
          ) : (
            <RawText variant='sub-text'>-</RawText>
          )
        },
      },
      {
        Header: translate('defi.apy'),
        accessor: 'apy',
        textAlign: 'right',
        Cell: ({ row }: { row: RowProps }) => (
          <Flex justifyContent={cellFlexJustifyContent}>
            <Tag colorScheme='green' size={cellTagSize}>
              <Amount.Percent value={row.original.apy} />
            </Tag>
          </Flex>
        ),
      },
      {
        Header: () => null,
        id: 'expander',
        textAlign: 'right',
        display: isCompactCols ? 'none' : 'table-cell',
        Cell: ({ row }: { row: RowProps }) => (
          <Flex justifyContent='flex-end' width='full'>
            <IconButton
              variant='ghost'
              size='md'
              aria-label={translate('common.table.expandRow')}
              isActive={row.isExpanded}
              icon={row.isExpanded ? <ArrowUpIcon /> : <ArrowDownIcon />}
            />
          </Flex>
        ),
      },
    ],
    [assets, isCompactCols, translate],
  )

  const handleRowClick = useCallback((row: RowProps) => {
    row.toggleRowExpanded()
  }, [])

  const renderSubComponent = useCallback(
    ({ original }: RowProps) => {
      return (
        <PositionDetails
          key={original.assetId}
          {...original}
          forceCompactView={forceCompactView}
          yieldOpportunities={original.yieldOpportunities}
        />
      )
    },
    [forceCompactView],
  )

  const renderEmptyComponent = useCallback(() => {
    return searchQuery ? (
      <SearchEmpty searchQuery={searchQuery} />
    ) : (
      <ResultsEmpty icon={emptyIcon} />
    )
  }, [searchQuery])

  const isInitialProcessing = useMemo(
    () => !processedRows.length && !isLoading && filteredByChain.length > 0,
    [filteredByChain.length, isLoading, processedRows.length],
  )

  if (isInitialProcessing) {
    return (
      <Box position='relative' p={4} textAlign='center'>
        <Spinner size='xl' color='blue.500' thickness='4px' />
      </Box>
    )
  }

  return (
    <ReactTable
      onRowClick={handleRowClick}
      data={processedRows}
      columns={columns}
      isLoading={isLoading}
      renderSubComponent={renderSubComponent}
      renderEmptyComponent={renderEmptyComponent}
      initialState={initialState}
      displayHeaders={!isCompactCols}
    />
  )
}
