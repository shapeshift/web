import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { walletSupportChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { selectAssets } from 'state/slices/assetsSlice/assetsSlice'
import { selectAccountIdByAddress } from 'state/slices/portfolioSlice/portfolioSlice'
import { supportedAccountTypes } from 'state/slices/preferencesSlice/preferencesSlice'
import { txHistory } from 'state/slices/txHistorySlice/txHistorySlice'
import { store } from 'state/store'

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

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      const supportedAdapters = chainAdapter.getSupportedAdapters()

      for (const getAdapter of supportedAdapters) {
        const adapter = getAdapter()
        const chain = adapter.getType()
        const chainId = await adapter.getCaip2()
        if (!walletSupportChain({ chainId, wallet })) continue

        const asset = Object.values(assets).find(asset => asset.caip2 === chainId)
        if (!asset) {
          throw new Error(`asset not found for chain ${chain}`)
        }

        const accountTypes = supportedAccountTypes[chain] ?? [undefined]

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
      chainAdapter.getSupportedAdapters().forEach(getAdapter => {
        dispatch(txHistory.actions.clear())
        getAdapter().unsubscribeTxs()
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, walletInfo?.deviceId])

  return <>{children}</>
}
