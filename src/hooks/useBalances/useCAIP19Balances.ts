import { toRootDerivationPath, utxoAccountParams } from '@shapeshiftoss/chain-adapters'
import { bip32ToAddressNList } from '@shapeshiftoss/hdwallet-core'
import { chainAdapters, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { getAssetService } from 'lib/assetService'
import { ReduxState } from 'state/reducer'

// returns object keyed by caip19 with value account, rather than janky flattened balances
export const useCAIP19Balances = () => {
  const [balances, setBalances] = useState<Record<string, chainAdapters.Account<ChainTypes>>>({})
  const [error, setError] = useState<Error | unknown>()
  const [loading, setLoading] = useState<boolean>(false)
  const chainAdapter = useChainAdapters()
  const {
    state: { wallet, walletInfo }
  } = useWallet()

  const accountTypes = useSelector((state: ReduxState) => state.preferences.accountTypes)

  const getBalances = useCallback(async () => {
    if (!wallet) return
    const supportedAdapters = chainAdapter.getSupportedAdapters()
    const acc: Record<string, chainAdapters.Account<ChainTypes>> = {}

    const service = await getAssetService()
    const assetData = service?.byNetwork(NetworkTypes.MAINNET)

    for (const getAdapter of supportedAdapters) {
      const adapter = getAdapter()

      // this should return CAIP2
      const key = adapter.getType()

      // asset should contain CAIP2, or utility fn CAIP19ToCAIP2
      const asset = assetData.find(asset => asset.chain === key)
      if (!asset) throw new Error(`asset not found for chain ${key}`)

      let addressOrXpub
      if (adapter.getType() === ChainTypes.Ethereum) {
        addressOrXpub = await adapter.getAddress({ wallet })
      } else if (adapter.getType() === ChainTypes.Bitcoin) {
        const accountType = accountTypes[key]
        const accountParams = utxoAccountParams(asset, accountType, 0)
        const { bip32Params, scriptType } = accountParams
        const pubkeys = await wallet.getPublicKeys([
          {
            coin: adapter.getType(),
            addressNList: bip32ToAddressNList(toRootDerivationPath(bip32Params)),
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
      acc[asset.caip19] = balanceResponse
    }
    return acc
    // We aren't passing chainAdapter as it will always be the same object and should never change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletInfo?.deviceId, JSON.stringify(accountTypes)])

  useEffect(() => {
    if (!wallet) return
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
    // Here we rely on the deviceId vs the wallet class
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletInfo?.deviceId, getBalances, JSON.stringify(accountTypes)])

  return {
    balances,
    error,
    loading
  }
}
