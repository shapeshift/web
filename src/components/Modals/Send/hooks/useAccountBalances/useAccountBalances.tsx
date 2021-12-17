import { Asset, ChainTypes } from '@shapeshiftoss/types'
import { chainAdapters } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectMarketDataById } from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppSelector } from 'state/store'

type UseAccountBalancesProps = {
  asset: Asset
  // TODO(0xdef1cafe): remove this coupling to ethereum specific tokens
  balances: Record<string, Partial<chainAdapters.Account<ChainTypes> & chainAdapters.AssetBalance>>
}

// TODO(0xdef1cafe): don't pass balances in, don't pass asset in
export const useAccountBalances = ({ asset, balances }: UseAccountBalancesProps) => {
  const assetBalance = balances[asset.caip19]

  const marketData = useAppSelector(state => selectMarketDataById(state, asset.caip19))

  const accountBalances = useMemo(() => {
    const crypto = bnOrZero(assetBalance?.balance).div(`1e${asset.precision}`)
    const fiat = crypto.times(marketData?.price || 0)
    return {
      crypto,
      fiat
    }
  }, [assetBalance, marketData, asset])

  return { assetBalance, accountBalances }
}
