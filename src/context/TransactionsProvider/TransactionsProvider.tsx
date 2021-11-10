import { utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import { NetworkTypes } from '@shapeshiftoss/types'
import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useAllAccountTypes } from 'hooks/useAllAccountTypes/useAllAccountTypes'
import { getAssetService } from 'lib/assetService'
import { getAccountTypeKey } from 'state/slices/preferencesSlice/preferencesSlice'
import { txHistory } from 'state/slices/txHistorySlice/txHistorySlice'

type TransactionsProviderProps = {
  children: React.ReactNode
}

export const TransactionsProvider = ({ children }: TransactionsProviderProps): JSX.Element => {
  const dispatch = useDispatch()
  const {
    state: { wallet, walletInfo }
  } = useWallet()
  const chainAdapter = useChainAdapters()

  const allAccountTypes = useAllAccountTypes()

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      const supportedAdapters = chainAdapter.getSupportedAdapters()

      const service = await getAssetService()
      const assetData = service?.byNetwork(NetworkTypes.MAINNET)

      for (const getAdapter of supportedAdapters) {
        const adapter = getAdapter()
        const key = adapter.getType()

        try {
          const asset = assetData.find(asset => asset.chain === key)
          if (!asset) throw new Error(`asset not found for chain ${key}`)

          const accountType = allAccountTypes[getAccountTypeKey(key)]
          const accountParams = accountType ? utxoAccountParams(asset, accountType, 0) : {}

          await adapter.subscribeTxs(
            { wallet, ...accountParams },
            msg => {
              dispatch(txHistory.actions.onMessage({ message: msg }))
            },
            (err: any) => console.error(err)
          )
        } catch (e) {
          console.error('TransactionProvider: Error subscribing to transaction history', e)
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, walletInfo?.deviceId])

  return <>{children}</>
}
