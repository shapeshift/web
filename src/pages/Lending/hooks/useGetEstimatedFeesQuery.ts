import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { EstimatedFeesQueryKey } from 'react-queries/hooks/useQuoteEstimatedFeesQuery'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'
import { estimateFees } from 'components/Modals/Send/utils'
import { bn } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import {
  selectAssetById,
  selectFeeAssetById,
  selectMarketDataByAssetIdUserCurrency,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

// For use outside of react with queryClient.fetchQuery()
export const queryFn = async ({ queryKey }: { queryKey: EstimatedFeesQueryKey }) => {
  const { estimateFeesInput, asset, assetMarketData } = queryKey[1]

  // These should not be undefined when used with react-query, but may be when used outside of it since there's no "enabled" option
  if (
    !asset ||
    !estimateFeesInput?.to ||
    !(estimateFeesInput.accountId || estimateFeesInput.pubkey)
  )
    return

  const feeAsset = selectFeeAssetById(store.getState(), asset.assetId)

  if (!feeAsset) return

  const estimatedFees = await estimateFees(estimateFeesInput)
  const txFeeFiatUserCurrency = bn(fromBaseUnit(estimatedFees.fast.txFee, feeAsset.precision))
    .times(assetMarketData.price)
    .toString()
  return {
    estimatedFees,
    txFeeFiatUserCurrency,
    txFeeCryptoBaseUnit: estimatedFees.fast.txFee,
  }
}

export const useGetEstimatedFeesQuery = ({
  enabled,
  ...estimateFeesInput
}: EstimateFeesInput & { enabled: boolean; disableRefetch?: boolean }) => {
  const asset = useAppSelector(state => selectAssetById(state, estimateFeesInput.assetId))
  const assetMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, estimateFeesInput.assetId),
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
    enabled:
      enabled &&
      Boolean(
        estimateFeesInput.to && (estimateFeesInput.accountId || estimateFeesInput.pubkey) && asset,
      ),
    ...(enabled
      ? {
          // Ensures fees are refetched at an interval, including when the app is in the background
          refetchIntervalInBackground: true,
          refetchInterval: estimateFeesInput.disableRefetch ? false : 5000,
        }
      : {}),
  })

  return getEstimatedFeesQuery
}
