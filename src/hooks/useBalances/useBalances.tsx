import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { useCallback, useEffect, useState } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'

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

  const getBalances = useCallback(async () => {
    if (wallet) {
      const supportedAdapters = chainAdapter.getSupportedAdapters()
      const acc: Record<string, chainAdapters.Account<ChainTypes>> = {}
      for (const getAdapter of supportedAdapters) {
        const adapter = getAdapter()
        const key = adapter.getType()
        const address = await adapter.getAddress({ wallet })
        const balanceResponse = await adapter.getAccount(address)
        if (!balanceResponse) continue
        acc[key] = balanceResponse
      }
      return acc
    }
    // We aren't passing chainAdapter as it will always be the same object and should never change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletInfo?.deviceId])

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
  }, [walletInfo?.deviceId, getBalances])

  return {
    balances,
    error,
    loading
  }
}
