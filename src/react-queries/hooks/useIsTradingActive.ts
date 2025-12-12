import type { AssetId } from '@shapeshiftoss/caip'
import type { SwapperName } from '@shapeshiftoss/swapper'
import { getChainIdBySwapper } from '@shapeshiftoss/swapper'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import { getInboundAddressesQuery } from '../queries/thornode'

import { useThorchainMimir } from '@/lib/utils/thorchain/hooks/useThorchainMimir'
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
  const { queryKey, queryFn } = getInboundAddressesQuery(getChainIdBySwapper(swapperName))

  const {
    data: inboundAddressesData,
    isLoading: isInboundAddressesDataLoading,
    refetch: refetchInboundAddresses,
  } = useQuery({
    queryKey,
    queryFn: assetId ? queryFn : skipToken,
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
    select: data => selectInboundAddressData(data, assetId, swapperName),
  })

  const {
    data: mimir,
    isLoading: isMimirLoading,
    refetch: refetchMimir,
  } = useThorchainMimir({ chainId: getChainIdBySwapper(swapperName), enabled })

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
      swapperName,
      mimir: mimirResponse,
    })

    return _isTradingActive
  }, [assetId, refetchInboundAddresses, refetchMimir, swapperName])

  return {
    isTradingActive,
    isLoading: isInboundAddressesDataLoading || isMimirLoading,
    refetch,
  }
}
