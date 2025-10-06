import type { ChildToParentMessageReader, ChildToParentTransactionEvent } from '@arbitrum/sdk'
import { ChildToParentMessageStatus, ChildTransactionReceipt } from '@arbitrum/sdk'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Query } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { ClaimStatus } from '@/components/ClaimRow/types'
import { assertUnreachable } from '@/lib/utils'

const AVERAGE_BLOCK_TIME_BLOCKS = 1000

type ClaimStatusResult = {
  event: ChildToParentTransactionEvent
  message: ChildToParentMessageReader
  status: ChildToParentMessageStatus
  timeRemainingSeconds: number | undefined
  txHash: string
}

export type ClaimStatusData = {
  claimStatus: ClaimStatus
  timeRemainingSeconds: number | undefined
  event: ChildToParentTransactionEvent
  message: ChildToParentMessageReader
  txHash: string
}

export const useArbitrumClaimStatus = (txHashes: string[]) => {
  const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  const claimStatuses = useQueries({
    queries: txHashes.map(txHash => ({
      queryKey: ['arbitrumClaimStatus', txHash],
      queryFn: async (): Promise<ClaimStatusResult> => {
        const receipt = await l2Provider.getTransactionReceipt(txHash)
        const l2Receipt = new ChildTransactionReceipt(receipt)
        const events = l2Receipt.getChildToParentEvents()
        const messages = await l2Receipt.getChildToParentMessages(l1Provider)
        const event = events[0]
        const message = messages[0]
        const status = await message.status(l2Provider)
        const block = (await message.getFirstExecutableBlock(l2Provider))?.toNumber()
        const timeRemainingSeconds = await (async () => {
          if (!block) return
          const latestBlock = await l1Provider.getBlock('latest')
          const historicalBlock = await l1Provider.getBlock(
            latestBlock.number - AVERAGE_BLOCK_TIME_BLOCKS,
          )
          const averageBlockTimeSeconds =
            (latestBlock.timestamp - historicalBlock.timestamp) / AVERAGE_BLOCK_TIME_BLOCKS
          const remainingBlocks = block - latestBlock.number
          return remainingBlocks * averageBlockTimeSeconds
        })()
        return {
          event,
          message,
          status,
          timeRemainingSeconds,
          txHash,
        }
      },
      select: ({ event, message, status, timeRemainingSeconds, txHash }: ClaimStatusResult) => {
        const claimStatus = (() => {
          switch (status) {
            case ChildToParentMessageStatus.CONFIRMED:
              return ClaimStatus.Available
            case ChildToParentMessageStatus.EXECUTED:
              return ClaimStatus.Complete
            case ChildToParentMessageStatus.UNCONFIRMED:
              return ClaimStatus.Pending
            default:
              assertUnreachable(status)
          }
        })()
        return {
          event,
          message,
          claimStatus,
          timeRemainingSeconds,
          txHash,
        }
      },
      // Periodically refetch until the status is known to be ChildToParentMessageStatus.EXECUTED
      refetchInterval: (latestData: Query<ClaimStatusResult>) =>
        latestData?.state?.data?.status === ChildToParentMessageStatus.EXECUTED ? false : 60_000,
      enabled: txHashes.length > 0,
      staleTime: Infinity,
      gcTime: Infinity,
    })),
  })

  const claimsByTxHash = useMemo(() => {
    return claimStatuses.reduce<Record<string, ClaimStatusData>>((acc, { data }) => {
      if (data) {
        acc[data.txHash] = data
      }
      return acc
    }, {})
  }, [claimStatuses])

  return {
    claimsByTxHash,
    isLoading: claimStatuses.some(claimStatus => claimStatus.isLoading),
  }
}
