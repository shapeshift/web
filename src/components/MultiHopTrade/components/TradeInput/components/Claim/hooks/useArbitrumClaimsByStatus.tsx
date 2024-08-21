import { L2ToL1MessageStatus, L2TransactionReceipt } from '@arbitrum/sdk'
import type {
  L2ToL1MessageReader,
  L2ToL1TransactionEvent,
} from '@arbitrum/sdk/dist/lib/message/L2ToL1Message'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { ClaimStatus } from 'components/ClaimRow/types'
import { getEthersV5Provider } from 'lib/ethersProviderSingleton'
import { assertUnreachable } from 'lib/utils'
import { selectAssetById } from 'state/slices/selectors'
import type { Tx } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'

const AVERAGE_BLOCK_TIME_BLOCKS = 1000

type ClaimStatusResult = {
  event: L2ToL1TransactionEvent
  message: L2ToL1MessageReader
  status: L2ToL1MessageStatus
  timeRemainingSeconds: number | undefined
}

export type ClaimDetails = Omit<ClaimStatusResult, 'status'> & {
  amountCryptoBaseUnit: string
  assetId: string
  description: string
  destinationAddress: string
  destinationAssetId: AssetId
  destinationChainId: ChainId
  destinationExplorerTxLink: string
  tx: Tx
}

type ClaimsByStatus = Record<ClaimStatus, ClaimDetails[]>

export const useArbitrumClaimsByStatus = (txs: Tx[]) => {
  const translate = useTranslate()

  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))

  const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  const queries = useMemo(() => {
    return {
      queries: txs.map(tx => {
        return {
          queryKey: ['claimStatus', { txid: tx.txid }],
          queryFn: async () => {
            const receipt = await l2Provider.getTransactionReceipt(tx.txid)
            const l2Receipt = new L2TransactionReceipt(receipt)
            const events = l2Receipt.getL2ToL1Events()
            const messages = await l2Receipt.getL2ToL1Messages(l1Provider)

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
            }
          },
          select: ({ event, message, status, timeRemainingSeconds }: ClaimStatusResult) => {
            const claimStatus = (() => {
              switch (status) {
                case L2ToL1MessageStatus.CONFIRMED:
                  return ClaimStatus.Available
                case L2ToL1MessageStatus.EXECUTED:
                  return ClaimStatus.Complete
                case L2ToL1MessageStatus.UNCONFIRMED:
                  return ClaimStatus.Pending
                default:
                  assertUnreachable(status)
              }
            })()

            return {
              tx,
              event,
              message,
              claimStatus,
              timeRemainingSeconds,
            }
          },
          refetchInterval: 60_000,
        }
      }),
    }
  }, [l1Provider, l2Provider, txs])

  const claimStatuses = useQueries(queries)

  const claimsByStatus = useMemo(() => {
    return claimStatuses.reduce<ClaimsByStatus>(
      (prev, { data }) => {
        if (!data) return prev
        if (!ethAsset) return prev
        if (!data.tx.transfers.length) return prev

        if (data.tx.data?.parser === 'arbitrumBridge') {
          if (!data.tx.data.value) return prev
          if (!data.tx.data.destinationAddress) return prev
          if (!data.tx.data.destinationAssetId) return prev

          prev[data.claimStatus].push({
            tx: data.tx,
            amountCryptoBaseUnit: data.tx.data.value,
            destinationAddress: data.tx.data.destinationAddress,
            destinationAssetId: data.tx.data.destinationAssetId,
            destinationChainId: ethChainId,
            destinationExplorerTxLink: ethAsset.explorerTxLink,
            assetId: data.tx.transfers[0].assetId,
            event: data.event,
            message: data.message,
            timeRemainingSeconds: data.timeRemainingSeconds,
            description: translate('bridge.arbitrum.description'),
          })
        }

        return prev
      },
      {
        [ClaimStatus.Pending]: [],
        [ClaimStatus.Available]: [],
        [ClaimStatus.Complete]: [],
      },
    )
  }, [ethAsset, claimStatuses, translate])

  return {
    claimsByStatus,
    isLoading: claimStatuses.some(claimStatus => claimStatus.isLoading),
  }
}
