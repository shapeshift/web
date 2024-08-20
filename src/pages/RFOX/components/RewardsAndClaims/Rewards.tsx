import { Box, CardBody } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId, thorchainAssetId, thorchainChainId, toAccountId } from '@shapeshiftoss/caip'
import { Dex, TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo } from 'react'
import { Text } from 'components/Text'
import type { TxDetails } from 'hooks/useTxDetails/useTxDetails'
import { getTxLink } from 'lib/getTxLink'
import type { RewardDistributionWithMetadata } from 'pages/RFOX/hooks/useLifetimeRewardDistributionsQuery'
import { useLifetimeRewardDistributionsQuery } from 'pages/RFOX/hooks/useLifetimeRewardDistributionsQuery'
import { useRFOXContext } from 'pages/RFOX/hooks/useRfoxContext'
import { selectAssetById } from 'state/slices/selectors'
import type { Tx, TxId } from 'state/slices/txHistorySlice/txHistorySlice'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { RewardTransactionList } from './RewardTransactionList'

type RewardsContentProps = {
  stakingAssetAccountId: AccountId
}

type RewardsProps = {
  headerComponent: JSX.Element
}

const RewardsContent = ({ stakingAssetAccountId }: RewardsContentProps) => {
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const stakingAssetAccountAddresses = useMemo(() => {
    return [fromAccountId(stakingAssetAccountId).account]
  }, [stakingAssetAccountId])

  const lifetimeRewardDistributionsResult = useLifetimeRewardDistributionsQuery({
    stakingAssetAccountAddresses,
  })

  const isLoading = useMemo(() => {
    return (
      lifetimeRewardDistributionsResult.isLoading || lifetimeRewardDistributionsResult.isFetching
    )
  }, [lifetimeRewardDistributionsResult])

  const rewardDistributionsByTxId = useMemo(() => {
    if (!lifetimeRewardDistributionsResult.data) return {}

    return lifetimeRewardDistributionsResult.data.reduce<
      Record<string, RewardDistributionWithMetadata>
    >((acc, rewardDistribution) => {
      acc[rewardDistribution.txId] = rewardDistribution
      return acc
    }, {})
  }, [lifetimeRewardDistributionsResult])

  const txIds = useMemo(() => {
    return Object.entries(rewardDistributionsByTxId).map(([txId, distribution]) =>
      serializeTxIndex(
        toAccountId({ chainId: thorchainChainId, account: distribution.rewardAddress }),
        txId,
        distribution.rewardAddress,
      ),
    )
  }, [rewardDistributionsByTxId])

  const getTxDetails = useCallback(
    (txId: TxId): TxDetails | undefined => {
      if (!runeAsset) return

      const distribution = rewardDistributionsByTxId[txId]

      const tx: Tx = {
        pubkey: distribution.rewardAddress,
        status: TxStatus.Confirmed,
        chainId: thorchainChainId,
        blockHeight: 0,
        blockTime: 0,
        confirmations: 0,
        txid: txId,
        transfers: [
          {
            from: [],
            to: [distribution.rewardAddress],
            value: distribution.amount,
            assetId: thorchainAssetId,
            type: TransferType.Receive,
          },
        ],
        data: {
          parser: 'rfox',
          type: 'thorchain',
          method: 'reward',
          epoch: distribution.epoch,
          ipfsHash: distribution.ipfsHash,
          stakingAddress: distribution.stakingAddress,
        },
      }

      const txLink = getTxLink({
        name: Dex.Thor,
        defaultExplorerBaseUrl: '',
        txId,
      })

      return {
        tx,
        fee: undefined,
        transfers: tx.transfers.map(transfer => ({ ...transfer, asset: runeAsset })),
        type: 'method',
        txLink,
      }
    },
    [rewardDistributionsByTxId, runeAsset],
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

export const Rewards = ({ headerComponent }: RewardsProps) => {
  const { stakingAssetAccountId } = useRFOXContext()

  if (!stakingAssetAccountId) return null

  return (
    <CardBody>
      {headerComponent}
      <Box>
        <RewardsContent stakingAssetAccountId={stakingAssetAccountId} />
      </Box>
    </CardBody>
  )
}
