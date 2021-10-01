import { BalanceResponse, ChainTypes, Token } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import { useBalances } from './useBalances'

export const flattenTokenBalances = (balances: Record<string, BalanceResponse<ChainTypes>>) =>
  Object.keys(balances).reduce(
    (acc: Record<string, Partial<BalanceResponse<ChainTypes> & Token>>, key: string) => {
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
