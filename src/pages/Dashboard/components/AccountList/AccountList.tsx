import { chainAdapters, ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'
import { fetchAssets } from 'state/slices/assetsSlice/assetsSlice'

import { AccountRow, AccountRowArgs } from '../AccountRow/AccountRow'

type AccountListProps = {
  accounts: Record<string, chainAdapters.Account<ChainTypes>>
}

export const AccountList = ({ accounts }: AccountListProps) => {
  const dispatch = useDispatch()
  const assets = useSelector((state: ReduxState) => state.assets)

  useEffect(() => {
    if (Object.keys(assets).length < 20) {
      dispatch(fetchAssets({ network: NetworkTypes.MAINNET }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const accountsList = useMemo(() => {
    const array: AccountRowArgs[] = []
    Object.values(accounts).forEach(genericAccount => {
      switch (genericAccount.chain) {
        case ChainTypes.Ethereum: {
          const account = genericAccount as chainAdapters.Account<ChainTypes.Ethereum>
          array.push({ balance: account.balance, chain: account.chain })
          if (account.chainSpecific.tokens) {
            account.chainSpecific.tokens.forEach(tokenAccount => {
              array.push({
                balance: tokenAccount.balance,
                chain: account.chain,
                tokenId: tokenAccount.contract
              })
            })
          }
          break
        }
        case ChainTypes.Bitcoin: {
          const account = genericAccount as chainAdapters.Account<ChainTypes.Bitcoin>
          array.push({ balance: account.balance, chain: account.chain })
          break
        }
        default: {
          console.error(`AccountList: unknown chain ${genericAccount.chain}`)
          break
        }
      }
    })
    return array
  }, [accounts])

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
