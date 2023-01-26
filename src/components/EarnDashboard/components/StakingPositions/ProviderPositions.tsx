import { Button, Flex, Stack } from '@chakra-ui/react'
import { Tag } from '@chakra-ui/tag'
import { cosmosAssetId, cosmosChainId, fromAssetId, osmosisChainId } from '@shapeshiftoss/caip'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router'
import type { Column, Row } from 'react-table'
import { Amount } from 'components/Amount/Amount'
import { ReactTable } from 'components/ReactTable/ReactTable'
import { RawText } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import type {
  OpportunityId,
  StakingEarnOpportunityType,
} from 'state/slices/opportunitiesSlice/types'
import {
  selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  selectFirstAccountIdByChainId,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ProviderPositionProps = {
  ids: OpportunityId[]
}

export type RowProps = Row<StakingEarnOpportunityType>

export const ProviderPositions: React.FC<ProviderPositionProps> = ({ ids }) => {
  const location = useLocation()
  const history = useHistory()
  const {
    state: { isConnected, isDemoWallet },
    dispatch,
  } = useWallet()
  const stakingOpportunities = useAppSelector(
    selectAggregatedEarnUserStakingOpportunitiesIncludeEmpty,
  )
  const filteredDown = stakingOpportunities.filter(e => ids.includes(e.assetId as OpportunityId))

  const cosmosAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, cosmosChainId),
  )
  const osmosisAccountId = useAppSelector(state =>
    selectFirstAccountIdByChainId(state, osmosisChainId),
  )

  const handleClick = useCallback(
    (opportunity: RowProps) => {
      const {
        original: {
          type,
          provider,
          contractAddress,
          chainId,
          rewardAddress,
          assetId,
          highestBalanceAccountAddress,
        },
      } = opportunity
      const { assetReference, assetNamespace } = fromAssetId(assetId)
      const defaultAccountId = assetId === cosmosAssetId ? cosmosAccountId : osmosisAccountId

      if (!isConnected && isDemoWallet) {
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      history.push({
        pathname: location.pathname,
        search: qs.stringify({
          type,
          provider,
          chainId,
          defaultAccountId,
          contractAddress,
          assetNamespace,
          assetReference,
          highestBalanceAccountAddress,
          rewardId: rewardAddress,
          modal: 'overview',
        }),
        state: { background: location },
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, history, isConnected, location],
  )
  const columns: Column<StakingEarnOpportunityType>[] = useMemo(
    () => [
      {
        Header: 'Staking Position',
        accessor: 'assetId',
        Cell: ({ row }: { row: RowProps }) => (
          <Flex>
            <Stack
              divider={
                <RawText color='gray.500' mx={1}>
                  •
                </RawText>
              }
              direction='row'
            >
              <RawText textTransform='capitalize'>{row.original.provider}</RawText>
              {row.original.version && <RawText>{row.original.version}</RawText>}
            </Stack>
          </Flex>
        ),
        disableSortBy: true,
      },
      {
        Header: 'Total Value',
        accessor: 'fiatAmount',
        Cell: ({ row }: { row: RowProps }) => <Amount.Fiat value={row.original.fiatAmount} />,
      },
      {
        Header: 'APY',
        accessor: 'apy',
        Cell: ({ row }: { row: RowProps }) => (
          <Tag colorScheme='green'>
            <Amount.Percent value={row.original.apy} />
          </Tag>
        ),
      },
      {
        Header: 'Claimable Rewards',
        accessor: 'rewardsAmountsCryptoBaseUnit',
        Cell: ({ row }: { row: RowProps }) => <Amount.Fiat value='0' />,
      },
      {
        Header: () => null,
        id: 'expander',
        Cell: ({ row }: { row: RowProps }) => (
          <Button variant='ghost' size='sm' colorScheme='green' onClick={() => handleClick(row)}>
            Claim
          </Button>
        ),
      },
    ],
    [handleClick],
  )

  if (!filteredDown.length) return null

  return <ReactTable data={filteredDown} columns={columns} />
}
