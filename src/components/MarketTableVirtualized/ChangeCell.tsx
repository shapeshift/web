import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { memo } from 'react'

import { Amount } from '@/components/Amount/Amount'
import { selectMarketDataUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ChangeCellProps = {
  assetId: string
}

export const ChangeCell = memo<ChangeCellProps>(({ assetId }) => {
  const marketDataUserCurrencyById = useAppSelector(selectMarketDataUserCurrency)
  const changePercent24Hr = marketDataUserCurrencyById[assetId]?.changePercent24Hr ?? '0'

  return (
    <Amount.Percent
      fontWeight='semibold'
      value={bnOrZero(changePercent24Hr).times(0.01).toString()}
      autoColor
    />
  )
})
