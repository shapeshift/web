import { ChainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import { useBalances } from './useBalances'

export const flattenTokenBalances = (balances: Record<string, ChainAdapters.Account<ChainTypes>>) =>
  Object.keys(balances).reduce(
    (
      acc: Record<
        string,
        Partial<ChainAdapters.Account<ChainTypes> & ChainAdapters.Ethereum.Token>
      >,
      key: string
    ) => {
      const value = balances[key]
      acc[key] = value
      const { chain } = value
      switch (chain) {
        case ChainTypes.Ethereum: {
          const ethValue = value as ChainAdapters.Account<ChainTypes.Ethereum>
          const { tokens } = ethValue.chainSpecific
          if (!tokens) return acc
          tokens.forEach((token: ChainAdapters.Ethereum.Token) => {
            token.contract && (acc[token.contract.toLowerCase()] = token)
          })
          break
        }
        default:
          break
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
