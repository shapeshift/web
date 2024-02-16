import type { AssetId } from '@shapeshiftoss/caip'
import type { SwapErrorRight } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { Result } from '@sniptt/monads'
import { useQueries } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { reactQueries } from 'react-queries'
import { selectInboundAddressData, selectIsTradingActive } from 'react-queries/selectors'
import type { InboundAddressResponse } from 'lib/swapper/swappers/ThorchainSwapper/types'
import { thorchainBlockTimeMs } from 'lib/utils/thorchain/constants'

export const useIsTradingActive = ({ assetId }: { assetId: AssetId | undefined }) => {
  const [
    {
      data: inboundAddressesData,
      isLoading: isInboundAddressesDataLoading,
      refetch: refetchInboundAddresses,
    },
    { data: mimir, isLoading: isMimirLoading, refetch: refetchMimir },
  ] = useQueries({
    queries: [
      {
        ...reactQueries.thornode.inboundAddresses(),
        // Go stale instantly
        staleTime: 0,
        // Never store queries in cache since we always want fresh data
        gcTime: 0,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchInterval: 60_000,
        select: (data: Result<InboundAddressResponse[], SwapErrorRight>) =>
          selectInboundAddressData(data, assetId),
      },
      {
        ...reactQueries.thornode.mimir(),
        staleTime: thorchainBlockTimeMs,
      },
    ],
  })

  const isTradingActive = useMemo(() => {
    if (isMimirLoading || !mimir) return

    return selectIsTradingActive({
      assetId,
      inboundAddressResponse: inboundAddressesData,
      swapperName: SwapperName.Thorchain,
      mimir,
    })
  }, [assetId, inboundAddressesData, isMimirLoading, mimir])

  const refetch = useCallback(async () => {
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
