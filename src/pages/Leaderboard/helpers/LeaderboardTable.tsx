import { Skeleton } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHistory } from 'react-router-dom'
import type { Column, Row } from 'react-table'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { AssetCell } from './Cells'
type RowProps = Row<any>

export const LeaderboardTable = () => {
  const history = useHistory()
  const { getKeepkeyAsset, kkNftContract } = useKeepKey()

  const handleClick = useCallback(
    (input: any) => {
      const asset = getKeepkeyAsset(input.geckoId)
      if (!asset) throw new Error('dont have asset')
      const routeAssetId = `${asset.chainId}/${asset.assetId}`
      const url = `/assets/keepkey/${routeAssetId}`
      history.push({ pathname: url })
    },
    [getKeepkeyAsset, history],
  )

  const [data, setData] = useState([{ isLoaded: false }] as any)

  const loadBurnEvents = useCallback(async () => {
    const burnEvents = await kkNftContract.getPastEvents('Burn', {
      fromBlock: 0,
      toBlock: 'latest',
    })
    const burnTotals = burnEvents.reduce((acc: any, val: any) => {
      acc[val.returnValues.coinGeckoIdentifier] = bnOrZero(
        acc[val.returnValues.coinGeckoIdentifier],
      )
        .plus(bnOrZero(val.returnValues.amountVoted))
        .toString()
      return acc
    }, {})

    const formattedTotals = Object.keys(burnTotals).map(geckoId => {
      const burned = burnTotals[geckoId]

      return {
        geckoId,
        burned,
        isLoaded: true,
      }
    })

    const formattedTotals2 = formattedTotals
      .filter(total => {
        return getKeepkeyAsset(total.geckoId)
      })
      .sort((a, b) => bnOrZero(b.burned).minus(bnOrZero(a.burned)).toNumber())

    setData(formattedTotals2)
  }, [getKeepkeyAsset, kkNftContract])

  useEffect(() => {
    loadBurnEvents()
  }, [loadBurnEvents])

  const columns: Column<any>[] = useMemo(() => {
    return [
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
            <AssetCell geckoId={row.original.geckoId} />
          </Skeleton>
        ),
        disableSortBy: true,
      },
      {
        Header: 'Tokens Burned',
        accessor: 'burned',
        display: { base: 'none', lg: 'table-cell' },
        Cell: ({ value, row }: { value: string | undefined; row: RowProps }) => (
          <Skeleton isLoaded={row.original.isLoaded}>
            <RawText>{`${value}`}</RawText>
          </Skeleton>
        ),
      },
    ]
  }, [])

  const handleRowClick = useCallback((row: Row<any>) => handleClick(row.original), [handleClick])

  return <ReactTable data={data} columns={columns} onRowClick={handleRowClick} />
}
