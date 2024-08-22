import type { ChainId } from '@shapeshiftoss/caip'
import type { SafeTxInfo } from '@shapeshiftoss/swapper'
import { fetchSafeTransactionInfo } from '@shapeshiftoss/swapper'
import type { UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQuery } from '@tanstack/react-query'

type UseSafeTxQueryArgs = {
  chainId: ChainId
  maybeSafeTxHash: string | undefined
}

export const useSafeTxQuery = ({
  chainId,
  maybeSafeTxHash,
}: UseSafeTxQueryArgs): UseQueryResult<SafeTxInfo, Error> => {
  return useQuery({
    queryKey: ['safeTransaction', { chainId, maybeSafeTxHash }],
    queryFn: maybeSafeTxHash
      ? () => fetchSafeTransactionInfo({ chainId, safeTxHash: maybeSafeTxHash })
      : skipToken,
  })
}
