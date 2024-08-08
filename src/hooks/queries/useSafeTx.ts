import type { AccountId } from '@shapeshiftoss/caip'
import { fetchSafeTransactionInfo } from '@shapeshiftoss/swapper/dist/safe-utils'
import { type SafeTxInfo } from '@shapeshiftoss/swapper/dist/safe-utils/types'
import type { UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQuery } from '@tanstack/react-query'

type UseSafeTxQueryArgs = {
  accountId: AccountId | undefined
  maybeSafeTxHash: string | undefined
}

export const useSafeTxQuery = ({
  accountId,
  maybeSafeTxHash,
}: UseSafeTxQueryArgs): UseQueryResult<SafeTxInfo, Error> => {
  return useQuery({
    queryKey: ['safeTransaction', { chainId, maybeSafeTxHash }],
    queryFn:
      maybeSafeTxHash && accountId
        ? () => fetchSafeTransactionInfo({ chainId, maybeSafeTxHash })
        : skipToken,
  })
}
