import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, IconButton, Tag } from '@chakra-ui/react'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Column, Row } from 'react-table'

import { SearchEmpty } from './SearchEmpty'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { PositionDetails } from '@/components/EarnDashboard/components/PositionDetails/PositionDetails'
import { DefiIcon } from '@/components/Icons/DeFi'
import { ReactTable } from '@/components/ReactTable/ReactTable'
import { ResultsEmpty } from '@/components/ResultsEmpty'
import { RawText } from '@/components/Text'
import { useIsSnapInstalled } from '@/hooks/useIsSnapInstalled/useIsSnapInstalled'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { walletSupportsChain } from '@/hooks/useWalletSupportsChain/useWalletSupportsChain'
import { isEthAddress } from '@/lib/address/utils'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AggregatedOpportunitiesByAssetIdReturn } from '@/state/slices/opportunitiesSlice/types'
import {
  selectAccountIdsByChainId,
  selectAggregatedEarnOpportunitiesByAssetId,
  selectAssetById,
  selectAssetsSortedByMarketCap,
  selectFeeAssetByChainId,
  selectOpportunityApiPending,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type RowProps = Row<AggregatedOpportunitiesByAssetIdReturn>

const cellFlexJustifyContent = { base: 'flex-end', md: 'flex-start' }
const cellTagSize = { base: 'sm', md: 'md' }
const initialState = { pageSize: 30 }

const AssetCell = ({ assetId }: { assetId: AssetId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, asset?.chainId ?? ''))
  const networkName = feeAsset?.networkName || feeAsset?.name
  if (!asset) return null
  return (
    <Flex alignItems='center' gap={4}>
      <AssetIcon size='sm' assetId={assetId} key={assetId} />
      <Flex flexDir='column'>
        <RawText>
          {asset.name} {`(${asset.symbol})`}
        </RawText>
        {networkName !== asset.name ? (
          <RawText variant='sub-text' size='xs'>
            {`on ${networkName}`}
          </RawText>
        ) : null}
      </Flex>
    </Flex>
  )
}

export type PositionTableProps = {
  chainId?: ChainId
  searchQuery: string
  includeEarnBalances?: boolean
  includeRewardsBalances?: boolean
}

const emptyIcon = <DefiIcon boxSize='20px' color='blue.500' />

export const PositionTable: React.FC<PositionTableProps> = ({
  chainId,
  includeEarnBalances,
  includeRewardsBalances,
  searchQuery,
}) => {
  const translate = useTranslate()
  const assets = useAppSelector(selectAssetsSortedByMarketCap)
  const isLoading = useAppSelector(selectOpportunityApiPending)
  const selectAggregatedEarnOpportunitiesByAssetIdParams = useMemo(
    () => ({
      chainId,
      includeEarnBalances,
      includeRewardsBalances,
    }),
    [chainId, includeEarnBalances, includeRewardsBalances],
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
        Cell: ({ row, flatRows }: { row: RowProps; flatRows: any }) => (
          <RawText>{flatRows.indexOf(row) + 1}</RawText>
        ),
      },
      {
        Header: translate('defi.asset'),
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => <AssetCell assetId={row.original.assetId} />,
        disableSortBy: true,
      },
      {
        Header: translate('defi.totalValue'),
        id: 'fiatAmount',
        accessor: 'fiatAmount',
        Cell: ({ row }: { row: RowProps }) => {
          // A fiat amount can be positive or negative (debt) but not zero
          const hasValue = !bnOrZero(row.original.fiatAmount).isZero()
          return hasValue ? (
            <Amount.Fiat value={row.original.fiatAmount} />
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
        display: { base: 'none', md: 'table-cell' },
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
    [translate],
  )

  const filterRowsBySearchTerm = useCallback(
    (rows: AggregatedOpportunitiesByAssetIdReturn[], filterValue: any) => {
      if (!filterValue) return rows
      if (typeof filterValue !== 'string') {
        return []
      }
      const search = filterValue.trim().toLowerCase()
      if (isEthAddress(filterValue)) {
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

  const rows = useMemo(() => {
    return isSearching ? filterRowsBySearchTerm(filteredPositions, searchQuery) : filteredPositions
  }, [filterRowsBySearchTerm, filteredPositions, searchQuery, isSearching])

  const handleRowClick = useCallback((row: RowProps) => row.toggleRowExpanded(), [])

  const renderSubComponent = useCallback(
    ({ original }: RowProps) => <PositionDetails key={original.assetId} {...original} />,
    [],
  )

  const renderEmptyComponent = useCallback(() => {
    if (!(includeEarnBalances || includeRewardsBalances))
      return <ResultsEmpty ctaText='defi.startEarning' icon={emptyIcon} />
    return searchQuery ? (
      <SearchEmpty searchQuery={searchQuery} />
    ) : (
      <ResultsEmpty ctaHref='/earn' ctaText='defi.startEarning' />
    )
  }, [includeEarnBalances, includeRewardsBalances, searchQuery])

  return (
    <ReactTable
      onRowClick={handleRowClick}
      data={rows}
      columns={columns}
      isLoading={isLoading}
      renderSubComponent={renderSubComponent}
      renderEmptyComponent={renderEmptyComponent}
      initialState={initialState}
    />
  )
}
