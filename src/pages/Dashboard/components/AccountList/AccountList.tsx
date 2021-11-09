import { NetworkTypes } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AccountRow } from 'components/AccountRow/AccountRow'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { usePortfolio } from 'pages/Dashboard/contexts/PortfolioContext'
import { ReduxState } from 'state/reducer'
import { fetchAssets } from 'state/slices/assetsSlice/assetsSlice'

export const AccountList = () => {
  const dispatch = useDispatch()
  const assets = useSelector((state: ReduxState) => state.assets)
  const marketData = useSelector((state: ReduxState) => state.marketData.marketData)
  const { balances, totalBalance } = usePortfolio()

  useEffect(() => {
    // arbitrary number to just make sure we dont fetch all assets if we already have
    if (Object.keys(assets).length < 100) {
      dispatch(fetchAssets({ network: NetworkTypes.MAINNET }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accountRows = useMemo(() => {
    return (
      <>
        {Object.keys(balances)
          .sort((a, b) =>
            bnOrZero(balances[a]?.balance).gt(bnOrZero(balances[b]?.balance)) ? -1 : 1
          )
          .filter(key => bnOrZero(balances[key].balance).gt(0))
          .map(key => {
            const account = balances[key]
            const asset = assets[key]
            const balance = asset
              ? bnOrZero(account.balance).div(`1e+${asset.precision}`)
              : bnOrZero(0)
            const market = marketData[key]
            const fiatValue = balance.times(bnOrZero(market?.price)).toNumber()

            return (
              <AccountRow
                allocationValue={bnOrZero(fiatValue)
                  .div(bnOrZero(totalBalance))
                  .times(100)
                  .toNumber()}
                key={account.contract ?? account.chain}
                balance={account.balance ?? '0'}
                chain={account.chain}
                tokenId={account.contract}
              />
            )
          })}
      </>
    )
  }, [assets, balances, marketData, totalBalance])

  return accountRows
}
