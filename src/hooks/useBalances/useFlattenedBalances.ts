import { BalanceResponse, Token } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'

import { useBalances } from './useBalances'

export const flattenTokenBalances = (balances: Record<string, BalanceResponse>) =>
  Object.keys(balances).reduce(
    (acc: Record<string, Partial<BalanceResponse & Token>>, key: string) => {
      const value = balances[key]
      acc[key] = value
      if (value.tokens?.length) {
        value.tokens.forEach((token: Token) => {
          token.contract && (acc[token.contract.toLowerCase()] = token)
        })
      }
      return acc
    },
    {}
  )

export const useFlattenedBalances = () => {
  const { balances: walletBalances, error, loading } = useBalances()
  const balances = useMemo(() => flattenTokenBalances(walletBalances), [walletBalances])
  return {
    balances,
    error,
    loading
  }
}
