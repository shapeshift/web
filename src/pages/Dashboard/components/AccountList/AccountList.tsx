import { NetworkTypes } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { usePortfolio } from 'pages/Dashboard/contexts/PortfolioContext'
import { ReduxState } from 'state/reducer'
import { fetchAssets } from 'state/slices/assetsSlice/assetsSlice'

import { AccountRow } from '../AccountRow/AccountRow'

export const AccountList = () => {
  const dispatch = useDispatch()
  const assets = useSelector((state: ReduxState) => state.assets)
  const { balances } = usePortfolio()

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
        {Object.values(balances)
          .sort((a, b) => ((a?.balance ?? '0') > (b?.balance ?? '0') ? -1 : 1))
          .map(account => (
            <AccountRow
              key={account.contract ?? account.chain}
              balance={account.balance ?? '0'}
              chain={account.chain}
              tokenId={account.contract}
            />
          ))}
      </>
    )
  }, [balances])

  return accountRows
}
