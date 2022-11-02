import { Skeleton } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Column, Row } from 'react-table'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'

import { AssetCell } from './Cells'
import { nftAbi } from './nftAbi'
import Web3 from 'web3'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
type RowProps = Row<any>

export const LeaderboardTable = () => {

  const { getKeepkeyAsset } = useKeepKey()
  const [data, setData] = useState([] as any)

  const loadBurnEvents = useCallback( async () => {
    const network = 'goerli'
    const web3 = new Web3(new Web3.providers.HttpProvider(`https://${network}.infura.io/v3/fb05c87983c4431baafd4600fd33de7e`))
      const nftContract = new web3.eth.Contract(nftAbi as any, '0xa869a28a7185df50e4abdba376284c44497c4753')
      const burnEvents = await nftContract.getPastEvents('Burn', { fromBlock: 0, toBlock: 'latest'})
      const burnTotals = burnEvents.reduce( (acc: any, val: any) => {
        acc[val.returnValues.coinGeckoIdentifier] = (bnOrZero(acc[val.returnValues.coinGeckoIdentifier]).plus(bnOrZero(val.returnValues.amountVoted))).toString()
        return acc
      }, {})

      const formattedTotals = Object.keys(burnTotals).map( (geckoId) => {

        const burned = burnTotals[geckoId]

        return {
          geckoId,
          burned,
          isLoaded: true
        }
      })

      const formattedTotals2 = formattedTotals.filter(total => {
        return getKeepkeyAsset(total.geckoId)
      }).sort( (a, b) => bnOrZero(b.burned).minus(bnOrZero(a.burned)).toNumber())

      setData(formattedTotals2)
  }, [])

  useEffect( () => {
    loadBurnEvents()
  }, [])

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

  return <ReactTable data={data} columns={columns} />
}
