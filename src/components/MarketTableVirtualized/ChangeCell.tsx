import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { memo, useMemo } from 'react'

import { Amount } from '@/components/Amount/Amount'
import { selectMarketDataUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ChangeCellProps = {
  assetId: string
}

export const ChangeCell = memo<ChangeCellProps>(({ assetId }) => {
  const marketDataUserCurrencyById = useAppSelector(selectMarketDataUserCurrency)

  const changePercent24Hr = useMemo(() => {
    return marketDataUserCurrencyById[assetId]?.changePercent24Hr ?? '0'
  }, [marketDataUserCurrencyById, assetId])

  return (
    <Amount.Percent
      fontWeight='semibold'
      value={bnOrZero(changePercent24Hr).times(0.01).toString()}
      autoColor
    />
  )
})
