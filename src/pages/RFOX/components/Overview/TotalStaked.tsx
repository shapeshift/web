import type { AssetId } from '@shapeshiftoss/caip'
import { bn } from '@shapeshiftoss/chain-adapters'
import { useTranslate } from 'react-polyglot'
import { fromBaseUnit } from 'lib/math'
import { useTotalStakedQuery } from 'pages/RFOX/hooks/useGetTotalStaked'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StatItem } from './StatItem'

type TotalStakedProps = {
  stakingAssetId: AssetId
}

export const TotalStaked: React.FC<TotalStakedProps> = ({ stakingAssetId }) => {
  const translate = useTranslate()

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const stakingAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, stakingAssetId),
  )

  const totalStakedUserCurrencyResult = useTotalStakedQuery<string>({
    stakingAssetId,
    select: (totalStaked: bigint) => {
      return bn(fromBaseUnit(totalStaked.toString(), stakingAsset?.precision ?? 0))
        .times(stakingAssetMarketData.price)
        .toFixed(2)
    },
  })

  return (
    <StatItem
      description={translate('RFOX.totalStaked', { symbol: stakingAsset?.symbol })}
      helperDescription={translate('RFOX.totalStakedHelper', { symbol: stakingAsset?.symbol })}
      amountUserCurrency={totalStakedUserCurrencyResult.data}
      isLoading={totalStakedUserCurrencyResult.isLoading}
    />
  )
}
