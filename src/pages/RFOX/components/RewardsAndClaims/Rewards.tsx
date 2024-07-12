import { Box, CardBody } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Text } from 'components/Text'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import { useRewardTxIds } from 'pages/RFOX/hooks/useRewardTxIds'

type RewardsContentProps = {
  stakingAssetAccountId: AccountId
}

type RewardsProps = {
  stakingAssetAccountId: AccountId
  headerComponent: JSX.Element
}

const RewardsContent = ({ stakingAssetAccountId }: RewardsContentProps) => {
  const stakingAssetAccountAddresses = useMemo(() => {
    return [fromAccountId(stakingAssetAccountId).account]
  }, [stakingAssetAccountId])

  // TODO: Fetch any rune accounts not held in tx history
  const {
    data: maybeTxIds,
    isLoading: isRewardTxIdsLoading,
    isFetching: isRewardTxIdsFetching,
  } = useRewardTxIds({ stakingAssetAccountAddresses })

  const isLoading = useMemo(() => {
    // TODO: show loading state if tx history is also loading
    return isRewardTxIdsLoading || isRewardTxIdsFetching
  }, [isRewardTxIdsFetching, isRewardTxIdsLoading])

  // referential stability when coalescing txIds
  const txIds = useMemo(() => {
    return maybeTxIds ?? []
  }, [maybeTxIds])

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
