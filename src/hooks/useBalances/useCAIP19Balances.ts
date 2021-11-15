import { caip19 } from '@shapeshiftoss/caip'
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
      const chain = adapter.getType()

      const ethCAIP19 = caip19.toCAIP19({
        chain: ChainTypes.Ethereum,
        network: NetworkTypes.MAINNET
      })
      const btcCAIP19 = caip19.toCAIP19({
        chain: ChainTypes.Bitcoin,
        network: NetworkTypes.MAINNET
      })

      const assetCAIP19 = chain === ChainTypes.Ethereum ? ethCAIP19 : btcCAIP19

      // asset should contain CAIP2, or utility fn CAIP19ToCAIP2
      const asset = assetData.find(asset => asset.caip19 === assetCAIP19)
      if (!asset) throw new Error(`asset not found for chain ${chain}`)

      let addressOrXpub
      if (adapter.getType() === ChainTypes.Ethereum) {
        addressOrXpub = await adapter.getAddress({ wallet })
      } else if (adapter.getType() === ChainTypes.Bitcoin) {
        const accountType = accountTypes[chain]
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
      const account = await adapter.getAccount(addressOrXpub)
      if (!account) continue
      acc[asset.caip19] = account
      if (account.chain === ChainTypes.Ethereum) {
        const ethAccount = account as chainAdapters.Account<ChainTypes.Ethereum>
        const network = NetworkTypes.MAINNET
        ethAccount.chainSpecific?.tokens?.forEach(token => {
          const { contractType, contract: tokenId } = token
          const tokenCAIP19 = caip19
            .toCAIP19({ chain, network, contractType, tokenId })
            .toLowerCase()
          acc[tokenCAIP19] = { ...ethAccount, ...token }
        })
      }
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
