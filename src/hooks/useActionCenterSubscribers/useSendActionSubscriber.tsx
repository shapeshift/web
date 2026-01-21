import { usePrevious } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useRef } from 'react'

import { useNotificationToast } from '../useNotificationToast'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { GenericTransactionNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/GenericTransactionNotification'
import { getConfig } from '@/config'
import { SECOND_CLASS_CHAINS } from '@/constants/chains'
import { getChainAdapterManager } from '@/context/PluginProvider/chainAdapterSingleton'
import { getHyperEvmTransactionStatus } from '@/lib/utils/hyperevm'
import { getKatanaTransactionStatus } from '@/lib/utils/katana'
import { getMonadTransactionStatus } from '@/lib/utils/monad'
import { getNearTransactionStatus } from '@/lib/utils/near'
import { getPlasmaTransactionStatus } from '@/lib/utils/plasma'
import { getStarknetTransactionStatus, isStarknetChainAdapter } from '@/lib/utils/starknet'
import { getSuiTransactionStatus } from '@/lib/utils/sui'
import { getTonTransactionStatus } from '@/lib/utils/ton'
import { getTronTransactionStatus } from '@/lib/utils/tron'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { selectPendingWalletSendActions } from '@/state/slices/actionSlice/selectors'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { portfolioApi } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectTxs } from '@/state/slices/selectors'
import { txHistory } from '@/state/slices/txHistorySlice/txHistorySlice'
import { serializeTxIndex } from '@/state/slices/txHistorySlice/utils'
import { useAppDispatch, useAppSelector } from '@/state/store'

export const useSendActionSubscriber = () => {
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()

  const dispatch = useAppDispatch()

  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })

  const pendingSendActions = useAppSelector(selectPendingWalletSendActions)
  const txs = useAppSelector(selectTxs)

  const pollingIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const completeAction = useCallback(
    (action: ReturnType<typeof selectPendingWalletSendActions>[number]) => {
      const { txHash, accountId, accountIdsToRefetch } = action.transactionMetadata

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

      const chainId = fromAccountId(accountId).chainId
      const isSecondClassChain = SECOND_CLASS_CHAINS.includes(chainId as KnownChainIds)

      if (isSecondClassChain) {
        const { getAccount } = portfolioApi.endpoints
        const accountIdsToRefreshList = accountIdsToRefetch ?? [accountId]

        accountIdsToRefreshList.forEach(accountIdToRefresh => {
          dispatch(
            getAccount.initiate(
              { accountId: accountIdToRefresh, upsertOnFetch: true },
              { forceRefetch: true },
            ),
          )
        })
      }

      const isActive = toast.isActive(txHash)

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
              handleClick={handleClick}
              actionId={txHash}
              onClose={onClose}
              {...props}
            />
          )
        },
      })
    },
    [dispatch, toast, isDrawerOpen, openActionCenter],
  )

  const failAction = useCallback(
    (action: ReturnType<typeof selectPendingWalletSendActions>[number]) => {
      const { txHash } = action.transactionMetadata

      dispatch(
        actionSlice.actions.upsertAction({
          ...action,
          status: ActionStatus.Failed,
          updatedAt: Date.now(),
          transactionMetadata: {
            ...action.transactionMetadata,
            message: 'modals.send.sendFailed',
          },
        }),
      )

      const isActive = toast.isActive(txHash)

      if (isActive) return

      toast({
        id: txHash,
        duration: isDrawerOpen ? 5000 : null,
        status: 'error',
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
    },
    [dispatch, toast, isDrawerOpen, openActionCenter],
  )

  useEffect(() => {
    pendingSendActions.forEach(action => {
      const { accountId, txHash } = action.transactionMetadata
      const accountAddress = fromAccountId(accountId).account
      const chainId = fromAccountId(accountId).chainId

      const serializedTxIndex = serializeTxIndex(accountId, txHash, accountAddress)
      const tx = txs[serializedTxIndex]

      const isChainWithoutTxHistory = SECOND_CLASS_CHAINS.includes(chainId as KnownChainIds)

      if (isChainWithoutTxHistory) {
        const pollingKey = `${accountId}_${txHash}`

        if (!pollingIntervalsRef.current.has(pollingKey)) {
          const checkTxStatus = async () => {
            try {
              let isConfirmed = false

              switch (chainId) {
                case KnownChainIds.TronMainnet: {
                  const txStatus = await getTronTransactionStatus(txHash)

                  // The TX completed but might fail because runs out of energy, as for now we don't support failed sends lets consider it confirmed
                  // @TODO: Implement failed sends for TRON or a way to check for gas balance before sending so it fails before even sending
                  isConfirmed = txStatus === TxStatus.Confirmed || txStatus === TxStatus.Failed
                  break
                }
                case KnownChainIds.SuiMainnet: {
                  const suiTxStatus = await getSuiTransactionStatus(txHash)
                  isConfirmed =
                    suiTxStatus === TxStatus.Confirmed || suiTxStatus === TxStatus.Failed
                  break
                }
                case KnownChainIds.MonadMainnet: {
                  const monadTxStatus = await getMonadTransactionStatus(txHash)
                  isConfirmed =
                    monadTxStatus === TxStatus.Confirmed || monadTxStatus === TxStatus.Failed
                  break
                }
                case KnownChainIds.PlasmaMainnet: {
                  const plasmaTxStatus = await getPlasmaTransactionStatus(txHash)
                  isConfirmed =
                    plasmaTxStatus === TxStatus.Confirmed || plasmaTxStatus === TxStatus.Failed
                  break
                }
                case KnownChainIds.HyperEvmMainnet: {
                  const hyperEvmNodeUrl = getConfig().VITE_HYPEREVM_NODE_URL
                  const hyperEvmTxStatus = await getHyperEvmTransactionStatus(
                    txHash,
                    hyperEvmNodeUrl,
                  )
                  isConfirmed =
                    hyperEvmTxStatus === TxStatus.Confirmed || hyperEvmTxStatus === TxStatus.Failed
                  break
                }
                case KnownChainIds.KatanaMainnet: {
                  const katanaNodeUrl = getConfig().VITE_KATANA_NODE_URL
                  const katanaTxStatus = await getKatanaTransactionStatus(txHash, katanaNodeUrl)
                  isConfirmed =
                    katanaTxStatus === TxStatus.Confirmed || katanaTxStatus === TxStatus.Failed
                  break
                }
                case KnownChainIds.NearMainnet: {
                  const nearTxStatus = await getNearTransactionStatus(txHash)
                  isConfirmed =
                    nearTxStatus === TxStatus.Confirmed || nearTxStatus === TxStatus.Failed
                  break
                }
                case KnownChainIds.TonMainnet: {
                  const tonTxStatus = await getTonTransactionStatus(txHash)
                  isConfirmed =
                    tonTxStatus === TxStatus.Confirmed || tonTxStatus === TxStatus.Failed
                  break
                }
                case KnownChainIds.StarknetMainnet: {
                  const adapter = getChainAdapterManager().get(chainId)
                  if (isStarknetChainAdapter(adapter)) {
                    const starknetTxStatus = await getStarknetTransactionStatus(txHash, adapter)

                    // Handle failed transactions
                    if (starknetTxStatus === TxStatus.Failed) {
                      // Parse and upsert Tx for transaction history
                      try {
                        if (adapter?.parseTx) {
                          const parsedTx = await adapter.parseTx(txHash, accountAddress)
                          dispatch(
                            txHistory.actions.onMessage({
                              message: parsedTx,
                              accountId,
                            }),
                          )
                        }
                      } catch (error) {
                        console.error('Failed to parse failed Starknet Tx:', error)
                      }

                      failAction(action)

                      const intervalId = pollingIntervalsRef.current.get(pollingKey)
                      if (intervalId) {
                        clearInterval(intervalId)
                        pollingIntervalsRef.current.delete(pollingKey)
                      }
                      return
                    }

                    isConfirmed = starknetTxStatus === TxStatus.Confirmed
                  }
                  break
                }
                default:
                  console.error(`Unsupported second-class chain: ${chainId}`)
                  return
              }

              if (isConfirmed) {
                // Parse and upsert Tx for second-class chains
                const { accountIdsToRefetch } = action.transactionMetadata
                const accountIdsToUpsert = accountIdsToRefetch ?? [accountId]

                try {
                  const adapter = getChainAdapterManager().get(chainId)
                  if (!adapter?.parseTx) {
                    completeAction(action)
                    const intervalId = pollingIntervalsRef.current.get(pollingKey)
                    if (intervalId) {
                      clearInterval(intervalId)
                      pollingIntervalsRef.current.delete(pollingKey)
                    }
                    return
                  }

                  // Parse and upsert for all involved accounts (sender + recipient if held)
                  await Promise.all(
                    accountIdsToUpsert.map(async accountIdToUpsert => {
                      const address = fromAccountId(accountIdToUpsert).account
                      const parsedTx = await adapter.parseTx(txHash, address)
                      dispatch(
                        txHistory.actions.onMessage({
                          message: parsedTx,
                          accountId: accountIdToUpsert,
                        }),
                      )
                    }),
                  )
                } catch (error) {
                  // Silent fail - Tx just won't show in history
                  console.error('Failed to parse and upsert Tx:', error)
                }

                completeAction(action)

                const intervalId = pollingIntervalsRef.current.get(pollingKey)
                if (intervalId) {
                  clearInterval(intervalId)
                  pollingIntervalsRef.current.delete(pollingKey)
                }
              }
            } catch (error) {
              console.error('Error checking transaction status:', error)
            }
          }

          checkTxStatus()

          const intervalId = setInterval(checkTxStatus, 10000)
          pollingIntervalsRef.current.set(pollingKey, intervalId)
        }

        return
      }

      if (!tx) return
      if (tx.status !== TxStatus.Confirmed) return

      completeAction(action)
    })
  }, [txs, pendingSendActions, completeAction, failAction, dispatch])

  useEffect(() => {
    const intervals = pollingIntervalsRef.current
    return () => {
      intervals.forEach(intervalId => clearInterval(intervalId))
      intervals.clear()
    }
  }, [])

  const previousIsDrawerOpen = usePrevious(isDrawerOpen)

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])
}
