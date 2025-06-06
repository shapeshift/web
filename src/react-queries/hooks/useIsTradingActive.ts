import type { AssetId } from '@shapeshiftoss/caip'
import type { InboundAddressResponse, SwapErrorRight } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import { useThorchainMimir } from '@/lib/utils/thorchain/hooks/useThorchainMimir'
import { reactQueries } from '@/react-queries'
import { selectInboundAddressData, selectIsTradingActive } from '@/react-queries/selectors'

export const useIsTradingActive = ({
  assetId,
  enabled = true,
  swapperName,
}: {
  assetId: AssetId | undefined
  enabled?: boolean
  swapperName: SwapperName
}) => {
  const {
    data: inboundAddressesData,
    isLoading: isInboundAddressesDataLoading,
    refetch: refetchInboundAddresses,
  } = useQuery({
    queryKey: reactQueries.thornode.inboundAddresses().queryKey,
    queryFn: assetId ? reactQueries.thornode.inboundAddresses().queryFn : skipToken,
    // Go stale instantly
    staleTime: 0,
    // Never store queries in cache since we always want fresh data
    gcTime: 0,
    ...(enabled && assetId
      ? {
          refetchInterval: 60_000,
          refetchOnWindowFocus: true,
          refetchOnMount: true,
        }
      : {}),
    select: (data: Result<InboundAddressResponse[], SwapErrorRight>) =>
      selectInboundAddressData(data, assetId),
  })

  const {
    data: mimir,
    isLoading: isMimirLoading,
    refetch: refetchMimir,
  } = useThorchainMimir({ enabled })

  const isTradingActive = useMemo(() => {
    return selectIsTradingActive({
      assetId,
      inboundAddressResponse: inboundAddressesData,
      swapperName,
      mimir,
    })
  }, [assetId, inboundAddressesData, mimir, swapperName])

  const refetch = useCallback(async () => {
    if (!assetId) throw new Error('assetId is required')

    const { data: mimirResponse } = await refetchMimir()
    if (!mimirResponse) return false

    const { data: inboundAddressesResponse } = await refetchInboundAddresses()

    const _isTradingActive = selectIsTradingActive({
      assetId,
      inboundAddressResponse: inboundAddressesResponse,
      swapperName: SwapperName.Thorchain,
      mimir: mimirResponse,
    })

    return _isTradingActive
  }, [assetId, refetchInboundAddresses, refetchMimir])

  return {
    isTradingActive,
    isLoading: isInboundAddressesDataLoading || isMimirLoading,
    refetch,
  }
}
