import { Box, CardBody } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, thorchainAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import type { TxTransfer } from '@shapeshiftoss/chain-adapters'
import { Dex, TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { DAO_TREASURY_THORCHAIN } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { Text } from 'components/Text'
import type { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { getTxLink } from 'lib/getTxLink'
import { useLifetimeRewardDistributionsQuery } from 'pages/RFOX/hooks/useLifetimeRewardDistributionsQuery'
import type { RewardDistribution } from 'pages/RFOX/types'
import { selectAssetById } from 'state/slices/selectors'
import type { Tx, TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

import { RewardTransactionList } from './RewardTransactionList'

type RewardsContentProps = {
  stakingAssetAccountId: AccountId
}

type RewardsProps = {
  stakingAssetAccountId: AccountId
  headerComponent: JSX.Element
}

const RewardsContent = ({ stakingAssetAccountId }: RewardsContentProps) => {
  const rune = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const stakingAssetAccountAddresses = useMemo(() => {
    return [fromAccountId(stakingAssetAccountId).account]
  }, [stakingAssetAccountId])

  const {
    data: maybeRewardDistributions,
    isLoading: isRewardDistributionsLoading,
    isFetching: isRewardDistributionsFetching,
  } = useLifetimeRewardDistributionsQuery({ stakingAssetAccountAddresses })

  const isLoading = useMemo(() => {
    return isRewardDistributionsLoading || isRewardDistributionsFetching
  }, [isRewardDistributionsFetching, isRewardDistributionsLoading])

  const rewardDistributionsByTxId = useMemo(() => {
    if (!maybeRewardDistributions) return {}
    return maybeRewardDistributions.reduce<Record<string, RewardDistribution>>(
      (acc, rewardDistribution) => {
        acc[rewardDistribution.txId] = rewardDistribution
        return acc
      },
      {},
    )
  }, [maybeRewardDistributions])

  const txIds = useMemo(() => {
    return Object.keys(rewardDistributionsByTxId)
  }, [rewardDistributionsByTxId])

  const getTxDetails = useCallback(
    (txId: TxId): TxDetails | undefined => {
      if (!rune) return

      const { rewardAddress, amount } = rewardDistributionsByTxId[txId]

      const txTransfer: TxTransfer = {
        from: [DAO_TREASURY_THORCHAIN],
        to: [rewardAddress],
        value: amount,
        assetId: thorchainAssetId,
        type: TransferType.Receive,
      }

      const tx: Tx = {
        pubkey: rewardAddress,
        status: TxStatus.Confirmed,
        chainId: thorchainChainId,
        blockHeight: 0,
        blockTime: 0,
        confirmations: 0,
        txid: txId,
        transfers: [txTransfer],
      }

      const txLink = getTxLink({
        name: Dex.Thor,
        defaultExplorerBaseUrl: '',
        txId,
      })

      return {
        tx,
        fee: undefined,
        transfers: [
          {
            ...txTransfer,
            asset: rune,
          },
        ],
        type: TransferType.Receive,
        txLink,
      }
    },
    [rewardDistributionsByTxId, rune],
  )

  if (!txIds.length && !isLoading) {
    return <Text color='text.subtle' translation='RFOX.noRewardsYet' />
  }

  return (
    <Box mx={-6}>
      <RewardTransactionList txIds={txIds} isLoading={isLoading} getTxDetails={getTxDetails} />
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
