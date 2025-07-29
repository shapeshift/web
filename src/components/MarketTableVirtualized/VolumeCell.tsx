import { memo } from 'react'

import { Amount } from '@/components/Amount/Amount'
import { selectMarketDataUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type VolumeCellProps = {
  assetId: string
}

export const VolumeCell = memo<VolumeCellProps>(({ assetId }) => {
  const marketDataUserCurrencyById = useAppSelector(selectMarketDataUserCurrency)
  const volume = marketDataUserCurrencyById[assetId]?.volume ?? '0'

  return <Amount.Fiat fontWeight='semibold' value={volume} />
})
