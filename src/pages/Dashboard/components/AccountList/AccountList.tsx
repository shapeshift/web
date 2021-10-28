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
  const { accountsList } = usePortfolio()

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
        {accountsList.map(account => (
          <AccountRow
            key={account.tokenId ?? account.chain}
            balance={account.balance}
            chain={account.chain}
            tokenId={account.tokenId}
          />
        ))}
      </>
    )
  }, [accountsList])

  return accountRows
}
