import type { AssetId } from '@shapeshiftoss/caip'
import { bn, bnOrZero } from '@shapeshiftoss/chain-adapters'
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

  const totalStakedUserCurrencyQuery = useTotalStakedQuery<string>({
    stakingAssetId,
    select: (totalStaked: bigint) => {
      return bn(fromBaseUnit(totalStaked.toString(), stakingAsset?.precision ?? 0))
        .times(bnOrZero(stakingAssetMarketData?.price))
        .toFixed(2)
    },
  })

  return (
    <StatItem
      description={translate('RFOX.totalStaked', { symbol: stakingAsset?.symbol })}
      helperDescription={translate('RFOX.totalStakedHelper', { symbol: stakingAsset?.symbol })}
      amountUserCurrency={totalStakedUserCurrencyQuery.data}
      isLoading={totalStakedUserCurrencyQuery.isLoading}
    />
  )
}
