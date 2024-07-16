import { Skeleton, Tag } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { EarnOpportunityType } from 'state/slices/opportunitiesSlice/types'
import { DefiProvider, DefiType } from 'state/slices/opportunitiesSlice/types'
import { makeDefiProviderDisplayName } from 'state/slices/opportunitiesSlice/utils'
import { store } from 'state/store'

import { AssetCell } from './Cells'

type StakingTableProps = {
  data: EarnOpportunityType[]
  onClick: (arg: EarnOpportunityType) => void
  showTeaser?: boolean
}

type RowProps = Row<EarnOpportunityType>

const tagSize = { base: 'sm', md: 'md' }

export const StakingTable = ({ data, onClick, showTeaser }: StakingTableProps) => {
  const translate = useTranslate()
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
        Header: translate('defi.asset'),
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => (
          <Skeleton isLoaded={row.original.isLoaded}>
            <AssetCell
              assetId={row.original.underlyingAssetId ?? row.original.assetId}
              subText={row.original.version}
              icons={row.original.icons}
              opportunityName={row.original.opportunityName}
              showTeaser={showTeaser}
              showAssetSymbol={row.original.showAssetSymbol}
              isExternal={row.original.isReadOnly}
            />
          </Skeleton>
        ),
        disableSortBy: true,
      },
      {
        Header: translate('defi.provider'),
        accessor: 'provider',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value, row }: { value: string; row: RowProps }) => {
          const assets = store.getState().assets.byId
          const asset = assets[row.original.assetId]
          const assetName = asset?.name ?? ''
          const providerDisplayName = makeDefiProviderDisplayName({
            provider: value,
            assetName,
          })
          return (
            <Skeleton isLoaded={row.original.isLoaded}>
              <Tag textTransform='capitalize' size={tagSize}>
                {providerDisplayName}
              </Tag>
            </Skeleton>
          )
        },
      },
      {
        Header: translate('defi.type'),
        accessor: 'type',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value, row }: { value: string | undefined; row: RowProps }) => (
          <Skeleton isLoaded={row.original.isLoaded}>
            <Tag
              textTransform={value === DefiType.LiquidityPool ? 'uppercase' : 'capitalize'}
              size={tagSize}
            >
              {value?.replace('_', ' ')}
            </Tag>
          </Skeleton>
        ),
      },
      {
        Header: translate('defi.apy'),
        accessor: 'apy',
        isNumeric: true,
        Cell: ({ value, row }: { value: string | number | undefined; row: RowProps }) => (
          <Skeleton isLoaded={row.original.isLoaded}>
            {row.original.provider !== DefiProvider.rFOX ? (
              <Tag size={tagSize} colorScheme='green'>
                <Amount.Percent value={value ?? ''} />
              </Tag>
            ) : (
              <RawText>-</RawText>
            )}
          </Skeleton>
        ),
        sortType: (a: RowProps, b: RowProps): number =>
          bnOrZero(a.original.apy).gt(bnOrZero(b.original.apy)) ? -1 : 1,
      },
      {
        Header: translate('defi.tvl'),
        accessor: 'tvl',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value, row }: { value: string | undefined; row: RowProps }) => (
          <Skeleton isLoaded={row.original.isLoaded}>
            {row.original.provider !== DefiProvider.rFOX ? (
              <Amount.Fiat value={value} />
            ) : (
              <RawText>-</RawText>
            )}
          </Skeleton>
        ),
      },
      {
        Header: translate('defi.balance'),
        accessor: 'fiatAmount',
        Cell: ({ value, row }: { value: string; row: RowProps }) => (
          <Skeleton isLoaded={row.original.isLoaded}>
            {!bnOrZero(value).isZero() ? (
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
    [showTeaser, translate],
  )

  const handleRowClick = useCallback(
    (row: Row<EarnOpportunityType>) => onClick(row.original),
    [onClick],
  )

  return (
    <ReactTable data={data} columns={columns} onRowClick={handleRowClick} variant='clickable' />
  )
}
