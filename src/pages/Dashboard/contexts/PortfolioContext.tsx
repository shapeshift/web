import { caip2, CAIP19, caip19 } from '@shapeshiftoss/caip'
import { chainAdapters, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import React, { useContext } from 'react'
import { useBalances } from 'hooks/useBalances/useBalances'
import { flattenTokenBalances, useFlattenedBalances } from 'hooks/useBalances/useFlattenedBalances'

import { useTotalBalance } from '../hooks/useTotalBalance/useTotalBalance'

type PortfolioContextProps = {
  totalBalance: number
  loading: boolean
  balances: ReturnType<typeof flattenTokenBalances>
  assets: CAIP19[]
}

const PortfolioContext = React.createContext<PortfolioContextProps | null>(null)

export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
  const { balances, loading } = useFlattenedBalances()
  const { balances: balancesByChain } = useBalances()
  const ethCAIP2 = caip2.toCAIP2({ chain: ChainTypes.Ethereum, network: NetworkTypes.MAINNET })
  const btcCAIP2 = caip2.toCAIP2({ chain: ChainTypes.Bitcoin, network: NetworkTypes.MAINNET })
  // insanity to get a list of assets
  const assets: CAIP19[] = Object.entries(balancesByChain).reduce<CAIP19[]>((acc, [k, v]) => {
    const { chain, network } = v
    const common = { chain, network }
    const balCAIP2 = caip2.toCAIP2(common)
    switch (balCAIP2) {
      case ethCAIP2: {
        const ethBalance = v as chainAdapters.Account<ChainTypes.Ethereum>
        ;(ethBalance.chainSpecific.tokens ?? []).forEach(token => {
          const { contractType, contract } = token
          const tokenId = contract
          const assetSpecific = { contractType, tokenId }
          const assetCAIP19 = caip19.toCAIP19({ ...common, ...assetSpecific })
          acc.push(assetCAIP19)
        })
        const ethCAIP19 = caip19.toCAIP19(common)
        acc.push(ethCAIP19)
        return acc
      }
      case btcCAIP2: {
        const btcCAIP19 = caip19.toCAIP19(common)
        acc.push(btcCAIP19)
        return acc
      }
      default: {
        throw new Error(`PortfolioProvider: unsupported chain ${balCAIP2}`)
      }
    }
  }, [])
  const totalBalance = useTotalBalance(balances)

  return (
    <PortfolioContext.Provider value={{ assets, totalBalance, loading, balances }}>
      {children}
    </PortfolioContext.Provider>
  )
}

export const usePortfolio = () => {
  const context = useContext(PortfolioContext)
  if (!context) throw new Error("usePortfolio can't be used outside of a PortfolioProvider")
  return context
}
