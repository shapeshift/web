import { CAIP2 } from '@shapeshiftoss/caip'
import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import { foxyAddresses } from '@shapeshiftoss/investor-foxy'
import { getConfig } from 'config'
import isEmpty from 'lodash/isEmpty'
import React, { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { walletSupportChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { AccountSpecifierMap } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { supportedAccountTypes } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectAccountIdByAddress,
  selectAccountSpecifiers,
  selectAssets,
  selectPortfolioAssetIds,
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
  const portfolioAssetIds = useSelector(selectPortfolioAssetIds)
  const accountSpecifiers = useSelector(selectAccountSpecifiers)
  const txHistoryStatus = useSelector(selectTxHistoryStatus)
  const txIds = useAppSelector(selectTxIds)

  const getAccountSpecifiersByChainId = useCallback(
    (chainId: CAIP2): AccountSpecifierMap[] => {
      return accountSpecifiers.reduce<AccountSpecifierMap[]>((acc, cur) => {
        const [_chainId, accountSpecifier] = Object.entries(cur)[0]
        if (_chainId !== chainId) return acc
        return acc.concat({ [chainId]: accountSpecifier })
      }, [])
    },
    [accountSpecifiers]
  )

  useEffect(() => {
    if (!wallet) return
    if (isEmpty(assets)) return
    const supportedChains = chainAdapter.getSupportedChains()
    ;(async () => {
      for (const chain of supportedChains) {
        const adapter = chainAdapter.byChain(chain)
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

        // RESTfully fetch all tx history for this chain.
        const chainAccountSpecifiers = getAccountSpecifiersByChainId(chainId)
        if (isEmpty(chainAccountSpecifiers)) continue
        chainAccountSpecifiers.forEach(accountSpecifierMap => {
          const { getAllTxHistory, getFoxyRebaseHistoryByAccountId } = txHistoryApi.endpoints
          const forceRefetch = true
          const options = { forceRefetch }
          dispatch(getAllTxHistory.initiate({ accountSpecifierMap }, options))

          /**
           * foxy rebase history is most closely linked to transactions.
           * unfortunately, we have to call this for a specific asset here
           * because we need it for the dashboard balance chart
           *
           * if you're reading this and are about to add another rebase token here,
           * stop, and make a getRebaseHistoryByAccountId that takes
           * an accountId and assetId[] in the txHistoryApi
           */
          if (getConfig().REACT_APP_FEATURE_FOXY_INVESTOR) {
            // fetch all rebase history for FOXy
            // you see what i did here?
            foxyAddresses.forEach(addresses => {
              const address = addresses.foxy
              if (!portfolioAssetIds.join('').includes(address.toLowerCase())) return
              dispatch(getFoxyRebaseHistoryByAccountId.initiate({ accountSpecifierMap, address }, options))
            })
          }
        })
      }
    })()

    return () => {
      dispatch(txHistory.actions.clear())
      supportedChains.forEach(chain => {
        try {
          const adapter = chainAdapter.byChain(chain)
          adapter.unsubscribeTxs()
        } catch (e) {
          console.error('TransactionsProvider: Error unsubscribing from transaction history', e)
        }
      })
    }
  }, [
    assets,
    dispatch,
    walletInfo?.deviceId,
    wallet,
    chainAdapter,
    accountSpecifiers,
    getAccountSpecifiersByChainId,
    portfolioAssetIds
  ])

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
