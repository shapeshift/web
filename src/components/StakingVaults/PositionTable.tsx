import { ArrowDownIcon, ArrowUpIcon, Search2Icon } from '@chakra-ui/icons'
import { Circle, Flex, IconButton, Tag, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { PositionDetails } from 'components/EarnDashboard/components/PositionDetails/PositionDetails'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText, Text } from 'components/Text'
import { isEthAddress } from 'lib/address/utils'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { AggregatedOpportunitiesByAssetIdReturn } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnOpportunitiesByAssetId,
  selectAssetById,
  selectAssetsByMarketCap,
  selectFeeAssetByChainId,
  selectOpportunityApiPending,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type RowProps = Row<AggregatedOpportunitiesByAssetIdReturn>

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

const ResultsEmpty = ({ searchQuery }: { searchQuery?: string }) => {
  const bgColor = useColorModeValue('gray.100', 'gray.750')
  return (
    <Flex p={6} textAlign='center' alignItems='center' width='full' flexDir='column' gap={4}>
      <Flex>
        <Circle bg={bgColor} size='40px'>
          <Search2Icon />
        </Circle>
      </Flex>
      <Flex alignItems='center' textAlign='center' flexDir='column' gap={2}>
        <Text
          fontWeight='bold'
          fontSize='lg'
          letterSpacing='0.02em'
          translation='common.noResultsFound'
        />
        <Text
          color='gray.500'
          letterSpacing='0.012em'
          translation={['common.noResultsBody', { searchQuery: `"${searchQuery}"` }]}
        />
      </Flex>
    </Flex>
  )
}

export type PositionTableProps = {
  searchQuery: string
  filterBy?: (
    opportunities: AggregatedOpportunitiesByAssetIdReturn[],
  ) => AggregatedOpportunitiesByAssetIdReturn[] | undefined
}

export const PositionTable: React.FC<PositionTableProps> = ({ searchQuery, filterBy }) => {
  const translate = useTranslate()
  const assets = useAppSelector(selectAssetsByMarketCap)
  const isLoading = useAppSelector(selectOpportunityApiPending)
  const positions = useAppSelector(selectAggregatedEarnOpportunitiesByAssetId)

  const filteredPositions = useMemo(
    () => (filterBy ? filterBy(positions) : positions) ?? [],
    [filterBy, positions],
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
      const matchedAssets = matchSorter(rowAssets, search, { keys: ['name', 'symbol'] }).map(
        asset => asset.assetId,
      )
      const results = rows.filter(row => matchedAssets.includes(row.assetId))
      return results
    },
    [assets],
  )

  const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])

  const rows = useMemo(() => {
    return isSearching ? filterRowsBySearchTerm(filteredPositions, searchQuery) : filteredPositions
  }, [filterRowsBySearchTerm, filteredPositions, searchQuery, isSearching])

  return (
    <ReactTable
      onRowClick={row => row.toggleRowExpanded()}
      data={rows}
      columns={columns}
      isLoading={isLoading}
      renderSubComponent={({ original }) => (
        <PositionDetails key={original.assetId} {...original} />
      )}
      renderEmptyComponent={() => <ResultsEmpty searchQuery={searchQuery} />}
      initialState={{ sortBy: [{ id: 'fiatAmount', desc: true }], pageSize: 30 }}
    />
  )
}
