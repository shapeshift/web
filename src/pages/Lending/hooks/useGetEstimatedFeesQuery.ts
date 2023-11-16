import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { EstimateFeesInput } from 'components/Modals/Send/utils'
import { estimateFees } from 'components/Modals/Send/utils'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const useGetEstimatedFeesQuery = ({
  enabled,
  ...props
}: EstimateFeesInput & { enabled: boolean }) => {
  const estimatedFeesQueryKey = useMemo(() => ['estimateFees', props], [props])

  const asset = useAppSelector(state => selectAssetById(state, props.assetId))
  const assetMarketData = useAppSelector(state => selectMarketDataById(state, props.assetId))

  const useQuoteEstimatedFeesQuery = useQuery({
    queryKey: estimatedFeesQueryKey,
    staleTime: 30_000,
    queryFn: async () => {
      const estimatedFees = await estimateFees(props)
      const txFeeFiat = bnOrZero(estimatedFees.fast.txFee)
        .div(bn(10).pow(asset!.precision)) // actually defined at runtime, see "enabled" below
        .times(assetMarketData.price)
        .toString()
      return { estimatedFees, txFeeFiat, txFeeCryptoBaseUnit: estimatedFees.fast.txFee }
    },
    enabled: enabled && Boolean(props.to && asset),
  })

  return useQuoteEstimatedFeesQuery
}
