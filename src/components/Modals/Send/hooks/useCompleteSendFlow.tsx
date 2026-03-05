import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { btcChainId, CHAIN_NAMESPACE, fromAccountId, toAccountId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { assertGetUtxoChainAdapter } from '@/lib/utils/utxo'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import type { BtcUtxoRbfTxMetadata } from '@/state/slices/actionSlice/types'
import {
  ActionStatus,
  ActionType,
  GenericTransactionDisplayType,
  isGenericTransactionAction,
} from '@/state/slices/actionSlice/types'
import { selectInternalAccountIdByAddress } from '@/state/slices/addressBookSlice/selectors'
import { store, useAppDispatch } from '@/state/store'

type UseCompleteSendFlowArgs = {
  handleClose: () => void
}

type CompleteSendFlowArgs = {
  txHash: string
  to: string
  accountId: AccountId
  assetId: AssetId
  amountCryptoPrecision: string
  btcUtxoRbfTxMetadata?: BtcUtxoRbfTxMetadata
}

export const useCompleteSendFlow = ({ handleClose }: UseCompleteSendFlowArgs) => {
  const dispatch = useAppDispatch()
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  return useCallback(
    ({
      txHash,
      to,
      accountId,
      assetId,
      amountCryptoPrecision,
      btcUtxoRbfTxMetadata,
    }: CompleteSendFlowArgs) => {
      const { chainId, chainNamespace } = fromAccountId(accountId)

      const internalReceiveAccountId =
        chainNamespace === CHAIN_NAMESPACE.Evm
          ? toAccountId({ chainId, account: to })
          : selectInternalAccountIdByAddress(store.getState(), {
              accountAddress: to,
              chainId,
            })

      const accountIdsToRefetch = [accountId]

      if (internalReceiveAccountId) {
        accountIdsToRefetch.push(internalReceiveAccountId)
      }

      dispatch(
        actionSlice.actions.upsertAction({
          id: txHash,
          type: ActionType.Send,
          transactionMetadata: {
            displayType: GenericTransactionDisplayType.SEND,
            txHash,
            chainId,
            accountId,
            accountIdsToRefetch,
            assetId,
            amountCryptoPrecision,
            message: 'modals.send.status.pendingBody',
            isRbfEnabled: chainId === btcChainId,
            btcUtxoRbfTxMetadata,
          },
          status: ActionStatus.Pending,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      )

      if (chainId === btcChainId) {
        void (async () => {
          const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
          try {
            const adapter = assertGetUtxoChainAdapter(btcChainId)
            const fetchTransactionWithRetry = async (
              txid: string,
            ): Promise<Awaited<ReturnType<typeof adapter.httpProvider.getTransaction>>> => {
              for (let i = 0; i < 6; i++) {
                try {
                  return await adapter.httpProvider.getTransaction({ txid })
                } catch (e) {
                  if (i === 5) throw e
                  await sleep(1000)
                }
              }

              throw new Error('Failed to fetch transaction after retries')
            }
            const tx = await fetchTransactionWithRetry(txHash)
            const isRbfEnabled = tx.vin.some(
              vin => typeof vin.sequence === 'number' && vin.sequence < 0xfffffffe,
            )

            const existingAction = actionSlice.selectors.selectActionsById(store.getState())[txHash]
            if (!existingAction || !isGenericTransactionAction(existingAction)) return

            dispatch(
              actionSlice.actions.upsertAction({
                ...existingAction,
                transactionMetadata: {
                  ...existingAction.transactionMetadata,
                  isRbfEnabled,
                  btcUtxoRbfTxMetadata:
                    btcUtxoRbfTxMetadata ?? existingAction.transactionMetadata.btcUtxoRbfTxMetadata,
                },
                updatedAt: Date.now(),
              }),
            )
          } catch (e) {
            console.error('Failed to resolve BTC RBF capability:', e)
            const existingAction = actionSlice.selectors.selectActionsById(store.getState())[txHash]
            if (!existingAction || !isGenericTransactionAction(existingAction)) return

            dispatch(
              actionSlice.actions.upsertAction({
                ...existingAction,
                transactionMetadata: {
                  ...existingAction.transactionMetadata,
                  isRbfEnabled: false,
                },
                updatedAt: Date.now(),
              }),
            )
          }
        })()
      }

      toast({
        id: txHash,
        duration: isDrawerOpen ? 5000 : null,
        status: 'success',
        render: ({ onClose, ...props }) => {
          const handleClick = () => {
            onClose()
            openActionCenter()
          }

          return (
            <GenericTransactionNotification
              handleClick={handleClick}
              actionId={txHash}
              onClose={onClose}
              {...props}
            />
          )
        },
      })

      handleClose()
    },
    [dispatch, handleClose, isDrawerOpen, openActionCenter, toast],
  )
}
