import type { MarketData } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'
import { estimateFees } from 'components/Modals/Send/utils'
import type { Asset } from 'lib/asset-service'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type EstimatedFeesQueryKey = [
  'estimateFees',
  {
    enabled: boolean
    asset: Asset | undefined
    assetMarketData: MarketData
    estimateFeesInput: EstimateFeesInput | undefined
  },
]

// For use outside of react with queryClient.fetchQuery()
export const queryFn = async ({ queryKey }: { queryKey: EstimatedFeesQueryKey }) => {
  const { estimateFeesInput, asset, assetMarketData } = queryKey[1]

  // These should not be undefined when used with react-query, but may be when used outside of it since there's no "enabled" option
  if (!asset || !estimateFeesInput?.to || !estimateFeesInput.accountId) return

  const estimatedFees = await estimateFees(estimateFeesInput)
  const txFeeFiat = bnOrZero(estimatedFees.fast.txFee)
    .div(bn(10).pow(asset.precision))
    .times(assetMarketData.price)
    .toString()
  return { estimatedFees, txFeeFiat, txFeeCryptoBaseUnit: estimatedFees.fast.txFee }
}

export const useGetEstimatedFeesQuery = ({
  enabled,
  ...estimateFeesInput
}: EstimateFeesInput & { enabled: boolean }) => {
  const asset = useAppSelector(state => selectAssetById(state, estimateFeesInput.assetId))
  const assetMarketData = useAppSelector(state =>
    selectMarketDataById(state, estimateFeesInput.assetId),
  )

  const estimatedFeesQueryKey: EstimatedFeesQueryKey = useMemo(
    () => [
      'estimateFees',
      {
        enabled,
        asset,
        assetMarketData,
        estimateFeesInput,
      },
    ],
    [asset, assetMarketData, enabled, estimateFeesInput],
  )

  const getEstimatedFeesQuery = useQuery({
    queryKey: estimatedFeesQueryKey,
    staleTime: 30_000,
    queryFn,
    enabled: enabled && Boolean(estimateFeesInput.to && estimateFeesInput.accountId && asset),
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    refetchInterval: 5000,
  })

  return getEstimatedFeesQuery
}
