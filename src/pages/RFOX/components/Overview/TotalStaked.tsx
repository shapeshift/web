import type { AssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { StatItem } from './StatItem'

import { fromBaseUnit } from '@/lib/math'
import { useTotalStakedQuery } from '@/pages/RFOX/hooks/useGetTotalStaked'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type TotalStakedProps = {
  stakingAssetId: AssetId
}

export const TotalStaked: React.FC<TotalStakedProps> = ({ stakingAssetId }) => {
  const translate = useTranslate()

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const stakingAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAssetId),
  )

  const totalStakedQuery = useTotalStakedQuery({ stakingAssetId })

  const totalStakedUserCurrency = useMemo(() => {
    if (!totalStakedQuery.data) return
    return bn(fromBaseUnit(totalStakedQuery.data.toString(), stakingAsset?.precision ?? 0))
      .times(bnOrZero(stakingAssetMarketData?.price))
      .toFixed(2)
  }, [totalStakedQuery.data, stakingAsset?.precision, stakingAssetMarketData?.price])

  return (
    <StatItem
      description={translate('RFOX.totalStaked', { symbol: stakingAsset?.symbol })}
      helperDescription={translate('RFOX.totalStakedHelper', { symbol: stakingAsset?.symbol })}
      amountUserCurrency={totalStakedUserCurrency}
      isLoading={totalStakedQuery.isLoading}
    />
  )
}
