import type { AssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useTranslate } from 'react-polyglot'

import { StatItem } from './StatItem'

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
      return BigAmount.fromBaseUnit(totalStaked.toString(), stakingAsset?.precision ?? 0)
        .times(stakingAssetMarketData?.price ?? 0)
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
