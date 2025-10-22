import { usePrevious } from '@chakra-ui/react'
import { baseChainId, fromAccountId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useEffect } from 'react'

import { useNotificationToast } from '../useNotificationToast'
import { useBasePortfolioManagement } from './useFetchBasePortfolio'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingWalletSendActions } from '@/state/slices/actionSlice/selectors'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectTxs } from '@/state/slices/selectors'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useSendActionSubscriber = () => {
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()

  const dispatch = useAppDispatch()

  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  const pendingSendActions = useAppSelector(selectPendingWalletSendActions)
  const txs = useAppSelector(selectTxs)

  const { fetchBasePortfolio, upsertBasePortfolio } = useBasePortfolioManagement()

  useEffect(() => {
    pendingSendActions.forEach(async action => {
      const { accountId, txHash, chainId, assetId } = action.transactionMetadata
      const accountAddress = fromAccountId(accountId).account

      const serializedTxIndex = serializeTxIndex(accountId, txHash, accountAddress)
      const tx = txs[serializedTxIndex]

      // TEMP HACK FOR BASE
      if (chainId !== baseChainId) {
        if (!tx) return
        if (tx.status !== TxStatus.Confirmed) return
      } else {
        // give time for on chain confirmation (~2sec/block)
        await new Promise(resolve => setTimeout(resolve, 10000))
        fetchBasePortfolio()
        upsertBasePortfolio({ accountId, assetId })
      }

      dispatch(
        actionSlice.actions.upsertAction({
          ...action,
          status: ActionStatus.Complete,
          updatedAt: Date.now(),
          transactionMetadata: {
            ...action.transactionMetadata,
            message: 'modals.send.youHaveSent',
          },
        }),
      )

      const isActive = toast.isActive(txHash)

      // No double-toasty
      if (isActive) return

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
              // eslint-disable-next-line react-memo/require-usememo
              handleClick={handleClick}
              actionId={txHash}
              onClose={onClose}
              {...props}
            />
          )
        },
      })
    })
  }, [
    txs,
    pendingSendActions,
    dispatch,
    isDrawerOpen,
    openActionCenter,
    toast,
    fetchBasePortfolio,
    upsertBasePortfolio,
  ])

  const previousIsDrawerOpen = usePrevious(isDrawerOpen)

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])
}
