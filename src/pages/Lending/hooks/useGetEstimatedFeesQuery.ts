import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, MarketData } from '@shapeshiftoss/types'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'
import { estimateFees } from 'components/Modals/Send/utils'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type EstimatedFeesQueryKey = [
  'estimateFees',
  {
    enabled: boolean
    feeAsset: Asset | undefined
    feeAssetMarketData: MarketData
    estimateFeesInput: EstimateFeesInput | undefined
  },
]

// For use outside of react with queryClient.fetchQuery()
export const queryFn = async ({ queryKey }: { queryKey: EstimatedFeesQueryKey }) => {
  const { estimateFeesInput, feeAsset, feeAssetMarketData } = queryKey[1]

  // These should not be undefined when used with react-query, but may be when used outside of it since there's no "enabled" option
  if (!feeAsset || !estimateFeesInput?.to || !estimateFeesInput.accountId) return

  const estimatedFees = await estimateFees(estimateFeesInput)
  const txFeeFiat = bn(fromBaseUnit(estimatedFees.fast.txFee, feeAsset.precision))
    .times(feeAssetMarketData.price)
    .toString()
  return { estimatedFees, txFeeFiat, txFeeCryptoBaseUnit: estimatedFees.fast.txFee }
}

export const useGetEstimatedFeesQuery = ({
  enabled,
  ...estimateFeesInput
}: EstimateFeesInput & { enabled: boolean; disableRefetch?: boolean; feeAssetId: AssetId }) => {
  const feeAsset = useAppSelector(state => selectAssetById(state, estimateFeesInput.feeAssetId))
  const feeAssetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, estimateFeesInput.feeAssetId),
  )

  const estimatedFeesQueryKey: EstimatedFeesQueryKey = useMemo(
    () => [
      'estimateFees',
      {
        enabled,
        feeAsset,
        feeAssetMarketData,
        estimateFeesInput,
      },
    ],
    [feeAsset, feeAssetMarketData, enabled, estimateFeesInput],
  )

  const getEstimatedFeesQuery = useQuery({
    queryKey: estimatedFeesQueryKey,
    staleTime: 30_000,
    queryFn,
    enabled:
      enabled &&
      Boolean(
        feeAsset &&
          estimateFeesInput.to &&
          estimateFeesInput.accountId &&
          estimateFeesInput.amountCryptoPrecision,
      ),
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    refetchInterval: estimateFeesInput.disableRefetch ? false : 15_000,
  })

  return getEstimatedFeesQuery
}
