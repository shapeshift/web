import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import { AssetRow } from '../AssetRow/AssetRow'

type AssetListProps = {
  balances: Record<string, chainAdapters.Account<ChainTypes>>
}

export type DisplayAsset = {
  icon: string
  displayName: string
  symbol: string
  fiatPrice: string
  fiatValue: string
  displayBalance: string
  identifier: string
}

export const AssetList = ({ balances }: AssetListProps) => {
  const assets = useMemo(() => {
    const array = []
    Object.values(balances).forEach(balance => {
      array.push(balance)
      if (balance?.chainSpecific?.tokens) {
        balance?.chainSpecific?.tokens.forEach(token =>
          array.push({ ...token, chain: balance.chain })
        )
      }
    })
    return array
  }, [balances])

  return (
    <>
      {assets.map(balanceData => {
        return (
          <AssetRow
            key={balanceData.contract ?? balanceData.chain}
            balance={balanceData.balance}
            chain={balanceData.chain}
            tokenId={balanceData.contract}
          />
        )
      })}
    </>
  )
}
