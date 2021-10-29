import { bip32AndScript, bip32FromScript, toPath } from '@shapeshiftoss/chain-adapters'
import { bip32ToAddressNList } from '@shapeshiftoss/hdwallet-core'
import { chainAdapters, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useAllScriptTypes } from 'hooks/useAllScriptTypes/useAllScriptTypes'
import { getAssetService } from 'lib/assetService'
import { getScriptTypeKey } from 'state/slices/preferencesSlice/preferencesSlice'

type UseBalancesReturnType = {
  balances: Record<string, chainAdapters.Account<ChainTypes>>
  error?: Error | unknown
  loading: boolean
}

export const useBalances = (): UseBalancesReturnType => {
  const [balances, setBalances] = useState<Record<string, chainAdapters.Account<ChainTypes>>>({})
  const [error, setError] = useState<Error | unknown>()
  const [loading, setLoading] = useState<boolean>(false)
  const chainAdapter = useChainAdapters()
  const {
    state: { wallet, walletInfo }
  } = useWallet()

  const allScriptTypes = useAllScriptTypes()

  const getBalances = useCallback(async () => {
    if (wallet) {
      const supportedAdapters = chainAdapter.getSupportedAdapters()
      const acc: Record<string, chainAdapters.Account<ChainTypes>> = {}

      const service = await getAssetService()
      const assetData = service?.byNetwork(NetworkTypes.MAINNET)

      for (const getAdapter of supportedAdapters) {
        const adapter = getAdapter()
        const key = adapter.getType()

        const asset = assetData.find(asset => asset.chain === key)
        if (!asset) throw new Error(`asset not found for chain ${key}`)

        const scriptType = allScriptTypes[getScriptTypeKey(key)]

        let addressOrXpub
        if (adapter.getType() === 'ethereum') {
          addressOrXpub = await adapter.getAddress({ wallet, ...bip32AndScript(scriptType, asset) })
        } else if (adapter.getType() === 'bitcoin') {
          const bip32Params = bip32FromScript(scriptType, asset)
          const pubkeys = await wallet.getPublicKeys([
            {
              coin: adapter.getType(),
              addressNList: bip32ToAddressNList(toPath(bip32Params)),
              curve: 'secp256k1',
              scriptType
            }
          ])
          if (!pubkeys || !pubkeys[0]) throw new Error('Error getting public key')
          addressOrXpub = pubkeys[0].xpub
        } else {
          throw new Error('not implemented')
        }
        if (!addressOrXpub) throw new Error('Error getting addressOrXpub')
        const balanceResponse = await adapter.getAccount(addressOrXpub)
        if (!balanceResponse) continue
        acc[key] = balanceResponse
      }
      return acc
    }
    // We aren't passing chainAdapter as it will always be the same object and should never change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletInfo?.deviceId, JSON.stringify(allScriptTypes)])

  useEffect(() => {
    if (wallet) {
      ;(async () => {
        try {
          setLoading(true)
          const balances = await getBalances()
          balances && setBalances(balances)
        } catch (error) {
          setError(error)
        } finally {
          setLoading(false)
        }
      })()
    }
    // Here we rely on the deviceId vs the wallet class
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletInfo?.deviceId, getBalances, JSON.stringify(allScriptTypes)])

  return {
    balances,
    error,
    loading
  }
}
