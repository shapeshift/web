import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import { Flex, IconButton, Tag } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { PositionDetails } from 'components/EarnDashboard/components/PositionDetails'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { AggregatedOpportunitiesByAssetIdReturn } from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnOpportunitiesByAssetId,
  selectAssetById,
  selectAssetsByMarketCap,
  selectFeeAssetByChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { positionTableFilter } from './utils'

export type RowProps = Row<AggregatedOpportunitiesByAssetIdReturn>

const AssetCell = ({ assetId }: { assetId: AssetId }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, asset?.chainId ?? ''))
  const networkName = feeAsset?.networkName || feeAsset?.name
  if (!asset) return null
  return (
    <Flex alignItems='center' gap={4}>
      <AssetIcon size='sm' assetId={assetId} />
      <Flex flexDir='column'>
        <RawText>
          {asset.name} {`(${asset.symbol})`}
        </RawText>
        <RawText color='gray.500' fontSize='sm'>
          {`on ${networkName}`}
        </RawText>
      </Flex>
    </Flex>
  )
}

export const PositionTable = () => {
  const translate = useTranslate()
  const assets = useAppSelector(selectAssetsByMarketCap)
  const positions = useAppSelector(selectAggregatedEarnOpportunitiesByAssetId)

  const columns: Column<AggregatedOpportunitiesByAssetIdReturn>[] = useMemo(
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
        Cell: ({ row }: { row: RowProps }) => <AssetCell assetId={row.original.assetId} />,
        disableSortBy: true,
      },
      {
        Header: 'Total Value',
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
        Cell: ({ row }: { row: RowProps }) => {
          const hasRewards = bnOrZero(row.original.rewards).gt(0)
          return hasRewards ? (
            <Amount.Fiat value={row.original.rewards} />
          ) : (
            <RawText variant='sub-text'>-</RawText>
          )
        },
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
            />
          </Flex>
        ),
      },
    ],
    [translate],
  )
  return (
    <ReactTable
      onRowClick={row => row.toggleRowExpanded()}
      data={positions}
      columns={columns}
      renderSubComponent={PositionDetails}
      initialState={{ sortBy: [{ id: 'fiatAmount', desc: true }], pageSize: 30 }}
      customFilter={(rows, _columns, filterValue) => positionTableFilter(rows, filterValue, assets)}
    />
  )
}
