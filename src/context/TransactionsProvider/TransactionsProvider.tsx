import { bip32AndScript } from '@shapeshiftoss/chain-adapters'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useAllScriptTypes } from 'hooks/useAllScriptTypes/useAllScriptTypes'
import { getAssetService } from 'lib/assetService'
import { getScriptTypeKey } from 'state/slices/preferencesSlice/preferencesSlice'
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

  const allScriptTypes = useAllScriptTypes()

  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      const supportedAdapters = chainAdapter.getSupportedAdapters()

      const service = await getAssetService()
      const assetData = service?.byNetwork(NetworkTypes.MAINNET)

      for (const getAdapter of supportedAdapters) {
        const adapter = getAdapter()
        const key = adapter.getType()
        const asset = assetData.find(asset => asset.chain === key)
        if (!asset) throw new Error(`asset not found for chain ${key}`)

        const scriptType = allScriptTypes[getScriptTypeKey(key)]

        const address = await adapter.getAddress({
          wallet,
          ...bip32AndScript(scriptType, asset)
        })
        if (!address) return

        if (key !== ChainTypes.Ethereum) continue
        await adapter.subscribeTxs(
          { addresses: [address] },
          msg => {
            dispatch(txHistory.actions.onMessage({ message: msg }))
          },
          (err: any) => console.error(err)
        )
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, walletInfo?.deviceId])

  return <>{children}</>
}
