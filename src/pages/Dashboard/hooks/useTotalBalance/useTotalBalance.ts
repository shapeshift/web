import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Balances } from 'hooks/useBalances/useBalances'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { selectAssetsById } from 'state/slices/assetsSlice/assetsSlice'

export const useTotalBalance = (accounts: Balances) => {
  const marketData = useSelector((state: ReduxState) => state.marketData)
  const assets = useSelector(selectAssetsById)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    let balance = 0
    Object.values(accounts).forEach(account => {
      if (!account) return

      const accountMarketData = marketData.marketData.byId[account.caip19]
      const accountAsset = assets[account.caip19]

      if (!accountAsset) return
      if (!accountMarketData) return

      const cryptoValue = fromBaseUnit(account.balance ?? '0', accountAsset.precision)
      const fiatValue = bn(cryptoValue)
        .times(accountMarketData?.price ?? 0)
        .toFixed(2)
        .toString()
      balance = bn(balance).plus(fiatValue).toNumber()
    })
    setBalance(balance)
  }, [accounts, assets, marketData])

  return balance
}
