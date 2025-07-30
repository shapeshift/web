import { memo, useMemo } from 'react'

import { Amount } from '@/components/Amount/Amount'
import { selectMarketDataUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type VolumeCellProps = {
  assetId: string
}

export const VolumeCell = memo<VolumeCellProps>(({ assetId }) => {
  const marketDataUserCurrencyById = useAppSelector(selectMarketDataUserCurrency)

  const volume = useMemo(() => {
    return marketDataUserCurrencyById[assetId]?.volume ?? '0'
  }, [marketDataUserCurrencyById, assetId])

  return <Amount.Fiat fontWeight='semibold' value={volume} />
})
