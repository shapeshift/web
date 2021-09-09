import { BalanceResponse } from '@shapeshiftoss/chain-adapters'
import { useCallback, useEffect, useState } from 'react'
import { useChainAdapters } from 'context/ChainAdaptersProvider/ChainAdaptersProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'

type UseBalancesReturnType = {
  loading: boolean
  balances: Record<string, BalanceResponse>
}

export const useBalances = (): UseBalancesReturnType => {
  const {
    state: { wallet }
  } = useWallet()
  const [loading, setLoading] = useState<boolean>(false)
  const chainAdapter = useChainAdapters()
  const [balances, setBalances] = useState<Record<string, BalanceResponse>>({})

  const getBalances = useCallback(async () => {
    if (wallet) {
      const supportedAdapters = chainAdapter.getSupportedAdapters()
      const acc: Record<string, BalanceResponse> = {}
      for (const getAdapter of supportedAdapters) {
        const adapter = getAdapter()
        const key = adapter.getType()
        const address = await adapter.getAddress({ wallet, path: "m/44'/60'/0'/0/0" })
        const balanceResponse: BalanceResponse | undefined = await adapter.getBalance(address)
        if (!balanceResponse) continue
        acc[key] = balanceResponse
      }
      return acc
    }
  }, [wallet, chainAdapter])

  useEffect(() => {
    if (wallet) {
      setLoading(true)
      getBalances()
        .then((balances: Record<string, BalanceResponse> | undefined) => {
          balances && setBalances(balances)
        })
        .finally(() => setLoading(false))
    }
  }, [wallet, getBalances])

  return {
    loading,
    balances
  }
}
