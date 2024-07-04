import { Box, CardBody } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, thorchainAssetId, thorchainChainId, toAccountId } from '@shapeshiftoss/caip'
import { DAO_TREASURY_THORCHAIN } from '@shapeshiftoss/utils'
import { uniq } from 'lodash'
import { useCallback, useMemo } from 'react'
import { Text } from 'components/Text'
import { TransactionsGroupByDate } from 'components/TransactionHistory/TransactionsGroupByDate'
import { parseAbiStakingInfo } from 'pages/RFOX/hooks/helpers'
import { useStakingInfoHistoryQuery } from 'pages/RFOX/hooks/useStakingInfoHistoryQuery'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'
import type { AbiStakingInfo } from 'pages/RFOX/types'
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

  const select = useCallback((abiStakingInfo: AbiStakingInfo) => {
    const { runeAddress } = parseAbiStakingInfo(abiStakingInfo)
    return runeAddress
  }, [])

  const {
    data: historicalRuneAddresses,
    isLoading: isStakingInfoHistoryLoading,
    isFetching: isStakingInfoHistoryFetching,
  } = useStakingInfoHistoryQuery({ stakingAssetAccountAddress, select })

  const {
    data: currentRuneAddress,
    isLoading: isCurrentStakingInfoLoading,
    isFetching: isCurrentStakingInfoFetching,
  } = useStakingInfoQuery({ stakingAssetAccountAddress, select })

  const uniqueHistoricalRuneAddresses = useMemo(() => {
    if (!historicalRuneAddresses) {
      return []
    }

    return uniq(historicalRuneAddresses.map(({ result }) => result))
  }, [historicalRuneAddresses])

  const runeAddresses = useMemo(() => {
    if (!currentRuneAddress) {
      return uniqueHistoricalRuneAddresses
    }

    return uniq([...uniqueHistoricalRuneAddresses, currentRuneAddress])
  }, [uniqueHistoricalRuneAddresses, currentRuneAddress])

  const thorchainAccountIds = useMemo(() => {
    return runeAddresses.map(runeAddress =>
      toAccountId({
        chainId: thorchainChainId,
        account: runeAddress as string,
      }),
    )
  }, [runeAddresses])

  const txIdsFilter = useMemo(() => {
    return {
      assetId: thorchainAssetId,
      accountIds: thorchainAccountIds,
      txSender: DAO_TREASURY_THORCHAIN,
    }
  }, [thorchainAccountIds])

  // TODO: Fetch any rune accounts not held in tx history
  const txIds = useAppSelector(state => selectReceivedTxsForAccountIdsByFilter(state, txIdsFilter))

  const isLoading = useMemo(() => {
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

  if (!txIds.length) {
    return <Text color='text.subtle' translation='RFOX.noRewardsYet' />
  }

  // TODO: show loading state if tx history is also loading
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
