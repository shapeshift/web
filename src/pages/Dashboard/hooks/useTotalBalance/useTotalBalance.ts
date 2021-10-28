import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { flattenTokenBalances } from 'hooks/useBalances/useFlattenedBalances'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'

export const useTotalBalance = (accounts: ReturnType<typeof flattenTokenBalances>) => {
  const marketData = useSelector((state: ReduxState) => state.marketData)
  const assets = useSelector((state: ReduxState) => state.assets)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    let balance = 0
    Object.values(accounts).forEach(account => {
      if (!account) return
      const identifier = account.contract ?? account.chain
      const accountMarketData = marketData[identifier]
      const accountAsset = assets[identifier]
      if (accountMarketData && accountAsset) {
        const cryptoValue = fromBaseUnit(account.balance ?? '0', accountAsset.precision)
        const fiatValue = bn(cryptoValue)
          .times(accountMarketData?.price ?? 0)
          .toFixed(2)
          .toString()
        balance = bn(balance).plus(fiatValue).toNumber()
      }
    })
    setBalance(balance)
  }, [accounts, assets, balance, marketData])

  return balance
}
