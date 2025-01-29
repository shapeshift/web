import { useQuery } from '@tanstack/react-query'
import { reactQueries } from 'react-queries'
import { thorchainBlockTimeMs } from 'lib/utils/thorchain/constants'

export const useIsLendingActive = () => {
  const { data: mimir, isLoading: isMimirLoading } = useQuery({
    ...reactQueries.thornode.mimir(),
    queryKey: reactQueries.thornode.mimir().queryKey,
    queryFn: reactQueries.thornode.mimir().queryFn,
    staleTime: thorchainBlockTimeMs,
  })

  return {
    isLendingActive: mimir?.PAUSELOANS === 0,
    isMimirLoading,
  }
}
