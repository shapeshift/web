import { Box, Tag } from '@chakra-ui/react'
import { ChainTypes } from '@shapeshiftoss/types'
import { FeatureFlag } from 'constants/FeatureFlag'
import {
  EarnOpportunityType,
  useNormalizeOpportunities
} from 'features/defi/helpers/normalizeOpportunity'
import qs from 'qs'
import { useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import { Column } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { RawText, Text } from 'components/Text'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'
import { useSortedYearnVaults } from 'hooks/useSortedYearnVaults/useSortedYearnVaults'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { AssetCell } from './Cells'
import { StakingTable } from './StakingTable'

const testFoxy = [
  {
    tokenAddress: '0x49849c98ae39fff122806c06791fa73784fb3675',
    contractAddress: '0x49849c98ae39fff122806c06791fa73784fb3675',
    chain: ChainTypes.Ethereum,
    type: 'token-staking'
  }
]

export const AllEarnOpportunities = () => {
  const history = useHistory()
  const location = useLocation()
  const {
    state: { isConnected },
    dispatch
  } = useWallet()
  const earnFeature = FeatureFlag.Yearn
  const sortedVaults = useSortedYearnVaults()
  const allRows = useNormalizeOpportunities({
    vaultArray: sortedVaults,
    foxyArray: testFoxy
  })

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

  const handleClick = (opportunity: EarnOpportunityType) => {
    const { type, provider, contractAddress, chain, tokenAddress } = opportunity
    if (isConnected) {
      history.push({
        pathname: `/defi/${type}/${provider}/deposit`,
        search: qs.stringify({
          chain,
          contractAddress,
          tokenId: tokenAddress
        }),
        state: { background: location }
      })
    } else {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    }
  }

  if (!earnFeature) return null

  return (
    <Card variant='outline' my={6}>
      <Card.Header flexDir='row' display='flex'>
        <Box>
          <Card.Heading>
            <Text translation='defi.earn' />
          </Card.Heading>
          <Text color='gray.500' translation='defi.earnBody' />
        </Box>
      </Card.Header>
      <Card.Body pt={0} px={2}>
        <StakingTable columns={columns} data={allRows} onClick={handleClick} />
      </Card.Body>
    </Card>
  )
}
