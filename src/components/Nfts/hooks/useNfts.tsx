import { useMemo } from 'react'
import { useGetNftUserTokensQuery } from 'state/apis/nft/nftApi'
import { selectEnabledWalletAccountIds } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

export const useNfts = () => {
  const requestedAccountIds = useAppSelector(selectEnabledWalletAccountIds)

  const { isUninitialized, isLoading, isFetching, data } = useGetNftUserTokensQuery(
    {
      accountIds: requestedAccountIds,
    },
    { skip: requestedAccountIds.length === 0 },
  )

  const result = useMemo(
    () => ({
      isLoading: requestedAccountIds.length === 0 || isUninitialized || isLoading || isFetching,
      data,
    }),
    [data, isFetching, isLoading, isUninitialized, requestedAccountIds.length],
  )

  return result
}
