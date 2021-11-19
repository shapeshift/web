import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import { useBalances } from './useBalances'

export const flattenTokenBalances = (balances: Record<string, chainAdapters.Account<ChainTypes>>) =>
  Object.keys(balances).reduce(
    (
      acc: Record<
        string,
        Partial<chainAdapters.Account<ChainTypes> & chainAdapters.ethereum.Token> & {
          chain: ChainTypes
        }
      >,
      key: string
    ) => {
      const value = balances[key]
      acc[key] = value
      const { chain } = value
      switch (chain) {
        case ChainTypes.Ethereum: {
          const ethValue = value as chainAdapters.Account<ChainTypes.Ethereum>
          const { tokens } = ethValue.chainSpecific
          if (!tokens) return acc
          tokens.forEach((token: chainAdapters.ethereum.Token) => {
            token.contract &&
              (acc[token.contract.toLowerCase()] = {
                ...token,
                contract: token.contract.toLowerCase(),
                chain
              })
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
