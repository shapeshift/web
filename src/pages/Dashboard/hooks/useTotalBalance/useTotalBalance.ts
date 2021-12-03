import { caip19 } from '@shapeshiftoss/caip'
import { NetworkTypes } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { flattenTokenBalances } from 'hooks/useBalances/useFlattenedBalances'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { ReduxState } from 'state/reducer'
import { selectAssetsById } from 'state/slices/assetsSlice/assetsSlice'

export const useTotalBalance = (accounts: ReturnType<typeof flattenTokenBalances>) => {
  const marketData = useSelector((state: ReduxState) => state.marketData)
  const assets = useSelector(selectAssetsById)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    let balance = 0
    Object.values(accounts).forEach(account => {
      if (!account) return
      const { chain } = account
      const network = account?.network ?? NetworkTypes.MAINNET
      const contractType = account?.contractType
      const tokenId = account?.contract
      const assetCAIP19 = caip19.toCAIP19({ chain, network, contractType, tokenId })
      const accountMarketData = marketData.marketData.byId[assetCAIP19]
      const accountAsset = assets[assetCAIP19]
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
