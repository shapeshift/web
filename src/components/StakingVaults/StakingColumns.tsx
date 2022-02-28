import { Tag } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { Column } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { RawText } from 'components/Text'

import { AssetCell } from './Cells'

export const StakingColumns = (): Column[] => {
  const columns: Column[] = useMemo(
    () => [
      {
        Header: '#',
        Cell: ({ row }: { row: any }) => <RawText>{row.index}</RawText>
      },
      {
        Header: 'Asset',
        accessor: 'assetId',
        Cell: ({ row }: { row: any }) => (
          <AssetCell assetId={row.original.assetId} provider={row.original.provider} />
        )
      },
      {
        Header: 'Type',
        accessor: 'type',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value }: { value: string }) => <Tag>{value}</Tag>
      },
      {
        Header: 'APY',
        accessor: 'apy',
        isNumeric: true,
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value }: { value: string }) => (
          <Tag colorScheme='green'>
            <Amount.Percent value={value} />
          </Tag>
        ),
        sortType: (a: any, b: any) =>
          bnOrZero(a.original.apy).gt(bnOrZero(b.original.apy)) ? -1 : 1
      },
      {
        Header: 'TVL',
        accessor: 'tvl',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value }: { value: string }) => <Amount.Fiat value={value} />
      },
      {
        Header: 'Balance',
        accessor: 'fiatAmount',
        Cell: ({ value }: { value: string }) =>
          bnOrZero(value).gt(0) ? (
            <Amount.Fiat value={value} color='green.500' />
          ) : (
            <RawText>-</RawText>
          )
      }
    ],
    []
  )
  return columns
}
