import { BalanceResponse, Token } from '@shapeshiftoss/chain-adapters'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useMemo } from 'react'

// TODO (technojak) this should be removed in favor of the asset-service. For now assume the fallback is eth
const ETH_PRECISION = 18

type UseAccountBalancesProps = {
  asset: any
  balances: Record<string, Partial<BalanceResponse & Token>>
}

export const useAccountBalances = ({ asset, balances }: UseAccountBalancesProps) => {
  const assetBalance = asset?.contractAddress
    ? balances[asset?.contractAddress]
    : balances[asset.network]

  const accountBalances = useMemo(() => {
    // TODO (technojak) decimals should come from asset-service not on the market data for the asset
    // Hard coding to eths decimals for now
    const precision = assetBalance?.decimals || ETH_PRECISION
    const crypto = bnOrZero(assetBalance?.balance).div(`1e${precision}`)
    const fiat = crypto.times(asset.price)
    return {
      crypto,
      fiat
    }
  }, [assetBalance, asset])

  return { assetBalance, accountBalances }
}
