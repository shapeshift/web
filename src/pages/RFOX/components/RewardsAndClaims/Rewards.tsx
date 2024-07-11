import { Box, CardBody } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, thorchainAssetId, thorchainChainId, toAccountId } from '@shapeshiftoss/caip'
import { DAO_TREASURY_THORCHAIN } from '@shapeshiftoss/utils'
import { uniq } from 'lodash'
import { useMemo } from 'react'
import { Text } from 'components/Text'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import { isSome } from 'lib/utils'
import { selectRuneAddress } from 'pages/RFOX/helpers'
import { useStakingInfoHistoryQuery } from 'pages/RFOX/hooks/useStakingInfoHistoryQuery'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'
import { selectReceivedTxsForAccountIdsByFilter } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type RewardsContentProps = {
  stakingAssetAccountId: AccountId
}

type RewardsProps = {
  stakingAssetAccountId: AccountId
  headerComponent: JSX.Element
}

const RewardsContent = ({ stakingAssetAccountId }: RewardsContentProps) => {
  const stakingAssetAccountAddress = useMemo(
    () => fromAccountId(stakingAssetAccountId).account,
    [stakingAssetAccountId],
  )

  const {
    data: historicalRuneAddresses,
    isLoading: isStakingInfoHistoryLoading,
    isFetching: isStakingInfoHistoryFetching,
  } = useStakingInfoHistoryQuery({ stakingAssetAccountAddress, select: selectRuneAddress })

  const {
    data: currentRuneAddress,
    isLoading: isCurrentStakingInfoLoading,
    isFetching: isCurrentStakingInfoFetching,
  } = useStakingInfoQuery({ stakingAssetAccountAddress, select: selectRuneAddress })

  const uniqueHistoricalRuneAddresses = useMemo(() => {
    if (!historicalRuneAddresses) {
      return []
    }

    return uniq(historicalRuneAddresses.filter(isSome))
  }, [historicalRuneAddresses])

  const runeAddresses = useMemo(() => {
    if (!currentRuneAddress) {
      return uniqueHistoricalRuneAddresses
    }

    return uniq([...uniqueHistoricalRuneAddresses, currentRuneAddress])
  }, [uniqueHistoricalRuneAddresses, currentRuneAddress])

  const thorchainAccountIds = useMemo(() => {
    return runeAddresses.filter(isSome).map(runeAddress => {
      return toAccountId({
        chainId: thorchainChainId,
        account: runeAddress as string,
      })
    })
  }, [runeAddresses])

  const txIdsFilter = useMemo(() => {
    return {
      assetId: thorchainAssetId,
      accountIds: thorchainAccountIds,
      from: DAO_TREASURY_THORCHAIN,
    }
  }, [thorchainAccountIds])

  // TODO: Fetch any rune accounts not held in tx history
  const txIds = useAppSelector(state => selectReceivedTxsForAccountIdsByFilter(state, txIdsFilter))

  const isLoading = useMemo(() => {
    // TODO: show loading state if tx history is also loading
    return (
      isStakingInfoHistoryLoading ||
      isCurrentStakingInfoLoading ||
      isStakingInfoHistoryFetching ||
      isCurrentStakingInfoFetching
    )
  }, [
    isCurrentStakingInfoFetching,
    isCurrentStakingInfoLoading,
    isStakingInfoHistoryFetching,
    isStakingInfoHistoryLoading,
  ])

  if (!txIds.length && !isLoading) {
    return <Text color='text.subtle' translation='RFOX.noRewardsYet' />
  }

  return (
    <Box mx={-6}>
      <TransactionsGroupByDate txIds={txIds} isLoading={isLoading} />
    </Box>
  )
}

export const Rewards = ({ stakingAssetAccountId, headerComponent }: RewardsProps) => {
  return (
    <CardBody>
      {headerComponent}
      <Box>
        <RewardsContent stakingAssetAccountId={stakingAssetAccountId} />
      </Box>
    </CardBody>
  )
}
