import { Alert, AlertIcon } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useUnavailableBalanceChartDataAssetNames } from 'hooks/useBalanceChartData/utils'

type MaybeChartUnavailableProps = {
  assetIds: AssetId[]
}
export const MaybeChartUnavailable: React.FC<MaybeChartUnavailableProps> = memo(({ assetIds }) => {
  const translate = useTranslate()
  const unavailableAssetNames = useUnavailableBalanceChartDataAssetNames(assetIds)
  if (!unavailableAssetNames) return null
  return (
    <Alert status='warning'>
      <AlertIcon />
      {translate('common.chartUnavailable', { unavailableAssetNames })}
    </Alert>
  )
})
