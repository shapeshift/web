import type { AccountId } from '@shapeshiftmonorepo/caip'
import type { SafeTxInfo } from '@shapeshiftmonorepo/swapper'
import { fetchSafeTransactionInfo } from '@shapeshiftmonorepo/swapper'
import type { UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQuery } from '@tanstack/react-query'

import { fetchIsSmartContractAddressQuery } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'

type UseSafeTxQueryArgs = {
  accountId: AccountId | undefined
  maybeSafeTxHash: string | undefined
}

export const useSafeTxQuery = ({
  accountId,
  maybeSafeTxHash,
}: UseSafeTxQueryArgs): UseQueryResult<SafeTxInfo, Error> => {
  return useQuery({
    queryKey: ['safeTransaction', { accountId, safeTxHash: maybeSafeTxHash }],
    queryFn:
      maybeSafeTxHash && accountId
        ? () =>
            fetchSafeTransactionInfo({
              accountId,
              safeTxHash: maybeSafeTxHash,
              fetchIsSmartContractAddressQuery,
            })
        : skipToken,
    refetchInterval: 10000,
  })
}
