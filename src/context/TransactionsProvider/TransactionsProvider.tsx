import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import isEmpty from 'lodash/isEmpty'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useAccountSpecifiers } from 'hooks/useAccountSpecifiers/useAccountSpecifiers'
import { walletSupportChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { supportedAccountTypes } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectAccountIdByAddress,
  selectAssets,
  selectTxHistoryStatus,
  selectTxIds
} from 'state/slices/selectors'
import { txHistoryApi } from 'state/slices/txHistorySlice/txHistorySlice'
import { txHistory } from 'state/slices/txHistorySlice/txHistorySlice'
import { store, useAppSelector } from 'state/store'

type TransactionsProviderProps = {
  children: React.ReactNode
}

export const TransactionsProvider = ({ children }: TransactionsProviderProps): JSX.Element => {
  const dispatch = useDispatch()
  const {
    state: { wallet, walletInfo }
  } = useWallet()
  const chainAdapter = useChainAdapters()
  const assets = useSelector(selectAssets)
  const txHistoryStatus = useSelector(selectTxHistoryStatus)
  const txIds = useAppSelector(selectTxIds)
  const accountSpecifiers = useAccountSpecifiers()

  useEffect(() => {
    if (isEmpty(accountSpecifiers)) return
    accountSpecifiers.forEach(accountSpecifierMap => {
      dispatch(
        txHistoryApi.endpoints.getAllTxHistory.initiate(
          { accountSpecifierMap },
          { forceRefetch: true }
        )
      )
    })
  }, [dispatch, accountSpecifiers])

  useEffect(() => {
    if (!wallet) return
    if (isEmpty(assets)) return
    ;(async () => {
      const supportedAdapters = chainAdapter.getSupportedAdapters()
      for (const getAdapter of supportedAdapters) {
        const adapter = getAdapter()
        const chain = adapter.getType()
        const chainId = adapter.getCaip2()
        if (!walletSupportChain({ chainId, wallet })) continue

        const asset = Object.values(assets).find(asset => asset.caip2 === chainId)
        if (!asset) {
          throw new Error(`asset not found for chain ${chain}`)
        }

        const accountTypes = supportedAccountTypes[chain] ?? [undefined]

        // TODO(0xdef1cafe) - once we have restful tx history for all coinstacks
        // this state machine should be removed, and managed by the txHistory RTK query api
        dispatch(txHistory.actions.setStatus('loading'))
        for await (const accountType of accountTypes) {
          const accountParams = accountType ? utxoAccountParams(asset, accountType, 0) : {}
          try {
            await adapter.subscribeTxs(
              { wallet, accountType, ...accountParams },
              msg => {
                const caip10 = `${msg.caip2}:${msg.address}`
                const state = store.getState()
                const accountId = selectAccountIdByAddress(state, caip10)
                dispatch(
                  txHistory.actions.onMessage({
                    message: { ...msg, accountType },
                    accountSpecifier: accountId
                  })
                )
              },
              (err: any) => console.error(err)
            )
          } catch (e) {
            console.error(
              `TransactionProvider: Error subscribing to transaction history for chain: ${chain}, accountType: ${accountType}`,
              e
            )
          }
        }
      }
    })()

    return () => {
      dispatch(txHistory.actions.clear())
      chainAdapter.getSupportedAdapters().forEach(getAdapter => {
        try {
          getAdapter().unsubscribeTxs()
        } catch (e) {
          console.error('TransactionsProvider: Error unsubscribing from transaction history', e)
        }
      })
    }
  }, [assets, dispatch, walletInfo?.deviceId, wallet, chainAdapter, accountSpecifiers])

  /**
   * TODO(0xdef1cafe)
   * until all coinstacks (btc and eth) support restful tx pagination
   * we can't know when txs are actually loaded, but we can kind of infer it
   * like we do on the balance charts, by debouncing the txids coming in
   * over the websocket
   *
   * once we connect a wallet and subscribe to tx history, and leave sufficient
   * time (TX_DEBOUNCE_DELAY), we can be pretty sure they're finished loading,
   * and set a loaded flag
   *
   * after this, other parts of the app can useEffect on txids changing,
   * and act on new txs coming in
   */

  useEffect(() => {
    if (isEmpty(assets)) return
    if (!walletInfo?.deviceId) return // we can't be loaded if the wallet isn't connected
    if (txHistoryStatus !== 'loading') return // only start logic below once we know we're loading
    const TX_DEBOUNCE_DELAY = 5000
    const timer = setTimeout(
      () => dispatch(txHistory.actions.setStatus('loaded')),
      TX_DEBOUNCE_DELAY
    )
    return () => clearTimeout(timer) // clear if the input changes
  }, [assets, dispatch, txHistoryStatus, txIds, walletInfo?.deviceId])

  return <>{children}</>
}
