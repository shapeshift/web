import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Box, Flex, IconButton, Spinner, Tag, useMediaQuery } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Column, Row } from 'react-table'

import { SearchEmpty } from './SearchEmpty'

import { Amount } from '@/components/Amount/Amount'
import { PositionDetails } from '@/components/EarnDashboard/components/PositionDetails/PositionDetails'
import { DefiIcon } from '@/components/Icons/DeFi'
import { ReactTable } from '@/components/ReactTable/ReactTable'
import { ResultsEmpty } from '@/components/ResultsEmpty'
import { AssetCell } from '@/components/StakingVaults/Cells'
import { RawText } from '@/components/Text'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { isEvmAddress } from '@/lib/utils/isEvmAddress'
import type { AggregatedOpportunitiesByAssetIdReturn } from '@/state/slices/opportunitiesSlice/types'
import {
  selectAccountIdsByChainId,
  selectAggregatedEarnOpportunitiesByAssetId,
  selectAssetsSortedByMarketCap,
  selectIsAnyOpportunitiesApiQueryPending,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

export type RowProps = Row<AggregatedOpportunitiesByAssetIdReturn>

const cellFlexJustifyContent = { base: 'flex-end', md: 'flex-start' }
const cellTagSize = { base: 'sm', md: 'md' }
const initialState = { pageSize: 30 }
export type PositionTableProps = {
  chainId?: ChainId
  searchQuery: string
  forceCompactView?: boolean
}

const emptyIcon = <DefiIcon boxSize='20px' color='blue.500' />

export const PositionTable: React.FC<PositionTableProps> = ({
  chainId,
  searchQuery,
  forceCompactView = false,
}) => {
  const translate = useTranslate()
  const assets = useAppSelector(selectAssetsSortedByMarketCap)
  const isAnyOpportunitiesApiQueriesPending = useAppSelector(
    selectIsAnyOpportunitiesApiQueryPending,
  )
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })

  const isCompactCols = !isLargerThanMd || forceCompactView

  const [processedRows, setProcessedRows] = useState<AggregatedOpportunitiesByAssetIdReturn[]>([])
  const [, startTransition] = useTransition()

  const selectAggregatedEarnOpportunitiesByAssetIdParams = useMemo(
    () => ({
      chainId,
    }),
    [chainId],
  )

  const {
    state: { isConnected, wallet },
  } = useWallet()

  const positions = useAppSelector(state =>
    selectAggregatedEarnOpportunitiesByAssetId(
      state,
      selectAggregatedEarnOpportunitiesByAssetIdParams,
    ),
  )

  const { isSnapInstalled } = useIsSnapInstalled()
  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)

  const filteredPositions = useMemo(
    () =>
      !isConnected
        ? positions
        : positions.filter(position => {
            const chainAccountIds = accountIdsByChainId[fromAssetId(position.assetId).chainId] ?? []
            return walletSupportsChain({
              checkConnectedAccountIds: chainAccountIds,
              chainId: fromAssetId(position.assetId).chainId,
              wallet,
              isSnapInstalled,
            })
          }),
    [accountIdsByChainId, isConnected, isSnapInstalled, positions, wallet],
  )

  const columns: Column<AggregatedOpportunitiesByAssetIdReturn>[] = useMemo(
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
        id: 'fiatAmount',
        accessor: 'fiatAmount',
        Cell: ({ row }: { row: RowProps }) => {
          // A fiat amount can be positive or negative (debt) but not zero
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
        Cell: ({ row }: { row: RowProps }) =>
          row.original.apy !== undefined ? (
            <Flex justifyContent={cellFlexJustifyContent}>
              <Tag colorScheme='green' size={cellTagSize}>
                <Amount.Percent value={row.original.apy} />
              </Tag>
            </Flex>
          ) : (
            <Flex justifyContent={cellFlexJustifyContent}>
              <RawText variant='sub-text'>-</RawText>
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
    [translate, isCompactCols, assets],
  )

  const filterRowsBySearchTerm = useCallback(
    (rows: AggregatedOpportunitiesByAssetIdReturn[], filterValue: any) => {
      if (!filterValue) return rows
      if (typeof filterValue !== 'string') {
        return []
      }
      const search = filterValue.trim().toLowerCase()
      if (isEvmAddress(filterValue)) {
        return rows.filter(
          row => fromAssetId(row.assetId).assetReference.toLowerCase() === filterValue,
        )
      }
      const assetIds = rows.map(row => row.assetId)
      const rowAssets = assets.filter(asset => assetIds.includes(asset.assetId))
      const matchedAssets = matchSorter(rowAssets, search, {
        keys: ['name', 'symbol'],
        threshold: matchSorter.rankings.CONTAINS,
      }).map(asset => asset.assetId)
      const results = rows.filter(row => matchedAssets.includes(row.assetId))
      return results
    },
    [assets],
  )

  const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])

  useEffect(() => {
    if (!filteredPositions.length) return setProcessedRows([])

    startTransition(() => {
      const newRows = isSearching
        ? filterRowsBySearchTerm(filteredPositions, searchQuery)
        : filteredPositions
      setProcessedRows(newRows)
    })
  }, [filteredPositions, isSearching, searchQuery, filterRowsBySearchTerm])

  const handleRowClick = useCallback((row: RowProps) => row.toggleRowExpanded(), [])

  const renderSubComponent = useCallback(
    ({ original }: RowProps) => (
      <PositionDetails key={original.assetId} {...original} forceCompactView={forceCompactView} />
    ),
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
    () => !processedRows.length && !isAnyOpportunitiesApiQueriesPending && positions.length,
    [processedRows, isAnyOpportunitiesApiQueriesPending, positions],
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
      isLoading={isAnyOpportunitiesApiQueriesPending}
      renderSubComponent={renderSubComponent}
      renderEmptyComponent={renderEmptyComponent}
      initialState={initialState}
      displayHeaders={!isCompactCols}
    />
  )
}
