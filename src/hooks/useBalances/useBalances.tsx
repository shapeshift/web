import { CAIP19 } from '@shapeshiftoss/caip'
import {
  convertXpubVersion,
  toRootDerivationPath,
  utxoAccountParams
} from '@shapeshiftoss/chain-adapters'
import { bip32ToAddressNList, supportsBTC, supportsETH } from '@shapeshiftoss/hdwallet-core'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { ReduxState } from 'state/reducer'
import { selectAssets } from 'state/slices/assetsSlice/assetsSlice'

export type Balances = Record<CAIP19, chainAdapters.Account<ChainTypes>>

type UseBalancesReturnType = {
  balances: Balances
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

  const assets = useSelector(selectAssets)

  const accountTypes = useSelector((state: ReduxState) => state.preferences.accountTypes)

  const getBalances = useCallback(async () => {
    if (wallet) {
      const supportedAdapters = chainAdapter.getSupportedAdapters()
      const acc: Record<string, chainAdapters.Account<ChainTypes>> = {}

      for (const getAdapter of supportedAdapters) {
        const adapter = getAdapter()
        const adapterCAIP2 = await adapter.getCaip2()
        const chain = adapter.getType()

        const asset = Object.values(assets).find(asset => asset.caip2 === adapterCAIP2)
        if (!asset) throw new Error(`asset not found for: ${chain}`)

        let pubkey
        switch (chain) {
          case ChainTypes.Bitcoin: {
            if (!supportsBTC(wallet)) continue

            const accountType = accountTypes[chain]
            const accountParams = utxoAccountParams(asset, accountType, 0)
            const { bip32Params, scriptType } = accountParams
            const pubkeys = await wallet.getPublicKeys([
              {
                coin: chain,
                addressNList: bip32ToAddressNList(toRootDerivationPath(bip32Params)),
                curve: 'secp256k1',
                scriptType
              }
            ])

            if (!pubkeys?.[0]?.xpub) continue

            pubkey = convertXpubVersion(pubkeys[0].xpub, accountType)
            break
          }
          case ChainTypes.Ethereum:
            if (!supportsETH(wallet)) continue
            pubkey = await adapter.getAddress({ wallet })
            break
          default:
            console.warn(`chain not supported: ${chain}`)
            continue
        }

        const account = await adapter.getAccount(pubkey)
        if (!account) continue

        acc[account.caip19] = account

        if (account.chain === ChainTypes.Ethereum) {
          const ethAccount = account as chainAdapters.Account<ChainTypes.Ethereum>
          ethAccount.chainSpecific.tokens?.forEach(token => {
            acc[token.caip19] = { ...ethAccount, ...token }
          })
        }
      }
      return acc
    }
    // We aren't passing chainAdapter as it will always be the same object and should never change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletInfo?.deviceId, JSON.stringify(accountTypes)])

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
  }, [walletInfo?.deviceId, getBalances, JSON.stringify(accountTypes)])

  return {
    balances,
    error,
    loading
  }
}
