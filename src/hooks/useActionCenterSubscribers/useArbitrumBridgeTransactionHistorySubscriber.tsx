import type { ChildToParentMessageReader, ChildToParentTransactionEvent } from '@arbitrum/sdk'
import { ChildToParentMessageStatus, ChildTransactionReceipt } from '@arbitrum/sdk'
import { arbitrumChainId, ethChainId, toAccountId } from '@shapeshiftoss/caip'
import { getEthersV5Provider } from '@shapeshiftoss/contracts'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { Query } from '@tanstack/react-query'
import { useQueries } from '@tanstack/react-query'
import { uuidv4 } from '@walletconnect/utils'
import { useCallback, useEffect } from 'react'

import type { TxMetadata } from '../../../packages/unchained-client/src/evm/parser/arbitrumBridge'

import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
import { selectArbitrumWithdrawTxs } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const AVERAGE_BLOCK_TIME_BLOCKS = 1000

type ClaimStatusResult = {
  event: ChildToParentTransactionEvent
  message: ChildToParentMessageReader
  status: ChildToParentMessageStatus
  timeRemainingSeconds: number | undefined
}

// Helper hook to detect ArbitrumBridge withdrawals from transaction history and create initial actions
// TODO: Remove this in next PR when claim tab is removed - this replaces "poor man's migration"
export const useArbitrumBridgeTransactionHistorySubscriber = () => {
  const dispatch = useAppDispatch()
  const actionsById = useAppSelector(actionSlice.selectors.selectActionsById)
  const arbitrumWithdrawTxs = useAppSelector(selectArbitrumWithdrawTxs)

  const l1Provider = getEthersV5Provider(KnownChainIds.EthereumMainnet)
  const l2Provider = getEthersV5Provider(KnownChainIds.ArbitrumMainnet)

  const mapStatusToActionStatus = useCallback(
    (status: ChildToParentMessageStatus): ActionStatus => {
      switch (status) {
        case ChildToParentMessageStatus.UNCONFIRMED:
          return ActionStatus.Initiated
        case ChildToParentMessageStatus.CONFIRMED:
          return ActionStatus.ClaimAvailable
        case ChildToParentMessageStatus.EXECUTED:
          return ActionStatus.Claimed
        default:
          return ActionStatus.Initiated
      }
    },
    [],
  )

  const claimStatuses = useQueries({
    queries: arbitrumWithdrawTxs.map(tx => {
      // Check if action already exists for this transaction
      const existingAction = Object.values(actionsById).find(
        action =>
          action.type === ActionType.ArbitrumBridgeWithdraw &&
          action.arbitrumBridgeMetadata?.withdrawTxHash === tx.txid,
      )

      return {
        queryKey: ['arbitrumBridgeTransactionHistory', { txid: tx.txid }],
        queryFn: async (): Promise<ClaimStatusResult> => {
          const receipt = await l2Provider.getTransactionReceipt(tx.txid)
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
          }
        },
        select: ({ event, message, status, timeRemainingSeconds }: ClaimStatusResult) => ({
          tx,
          event,
          message,
          status: mapStatusToActionStatus(status),
          timeRemainingSeconds,
        }),
        // Refetch until executed
        refetchInterval: (latestData: Query<ClaimStatusResult>) =>
          latestData?.state?.data?.status === ChildToParentMessageStatus.EXECUTED ? false : 60_000,
        enabled: !existingAction, // Only query if action doesn't exist yet
        staleTime: Infinity,
        gcTime: Infinity,
      }
    }),
  })

  useEffect(() => {
    claimStatuses.forEach(({ data }) => {
      if (!data) return
      if (!data.tx.transfers.length) return
      if (data.tx.data?.parser !== 'arbitrumBridge') return

      const arbitrumData = data.tx.data as TxMetadata
      if (!arbitrumData.value) return
      if (!arbitrumData.destinationAddress) return
      if (!arbitrumData.destinationAssetId) return

      const withdrawTxHash = data.tx.txid

      // Check if action already exists
      const existingAction = Object.values(actionsById).find(
        action =>
          action.type === ActionType.ArbitrumBridgeWithdraw &&
          action.arbitrumBridgeMetadata?.withdrawTxHash === withdrawTxHash,
      )

      if (existingAction) return

      const actionId = uuidv4()
      dispatch(
        actionSlice.actions.upsertAction({
          id: actionId,
          createdAt: data.tx.blockTime * 1000,
          updatedAt: Date.now(),
          type: ActionType.ArbitrumBridgeWithdraw,
          status: data.status,
          arbitrumBridgeMetadata: {
            assetId: data.tx.transfers[0]?.assetId || '',
            withdrawTxHash,
            destinationAssetId: arbitrumData.destinationAssetId,
            amountCryptoBaseUnit: arbitrumData.value,
            timeRemainingSeconds: data.timeRemainingSeconds,
            accountId: toAccountId({
              chainId: arbitrumChainId,
              account: data.tx.pubkey,
            }),
            destinationAccountId: toAccountId({
              chainId: ethChainId,
              account: arbitrumData.destinationAddress,
            }),
          },
        }),
      )
    })
  }, [dispatch, actionsById, claimStatuses, mapStatusToActionStatus])
}
