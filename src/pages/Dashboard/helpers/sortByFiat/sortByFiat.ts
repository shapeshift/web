import { chainAdapters, ChainTypes, MarketData } from '@shapeshiftoss/types'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { AssetsState } from 'state/slices/assetsSlice/assetsSlice'

type SortByFiatInput = {
  balances: Record<string, Partial<chainAdapters.Account<ChainTypes>>>
  assets: AssetsState
  marketData: Record<string, MarketData>
}

export const sortByFiat =
  ({ balances, assets, marketData }: SortByFiatInput) =>
  (a: string, b: string) => {
    const balanceA = assets[a]
      ? bnOrZero(balances[a].balance).div(`1e+${assets[a].precision}`)
      : bnOrZero(0)
    const balanceB = assets[b]
      ? bnOrZero(balances[b].balance).div(`1e+${assets[b].precision}`)
      : bnOrZero(0)
    const fiatValueA = balanceA.times(bnOrZero(marketData[a]?.price)).toNumber()
    const fiatValueB = balanceB.times(bnOrZero(marketData[b]?.price)).toNumber()
    return bnOrZero(fiatValueA).gt(bnOrZero(fiatValueB)) ? -1 : 1
  }
