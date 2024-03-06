import { useMemo } from 'react'
import { useGetNftUserTokensQuery } from 'state/apis/nft/nftApi'
import { selectWalletAccountIds } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

export const useNfts = () => {
  const requestedAccountIds = useAppSelector(selectWalletAccountIds)

  const { isUninitialized, isLoading, isFetching, data } = useGetNftUserTokensQuery(
    {
      accountIds: requestedAccountIds,
    },
    { skip: requestedAccountIds.length === 0 },
  )

  return useMemo(
    () => ({
      isLoading: requestedAccountIds.length === 0 || isUninitialized || isLoading || isFetching,
      data,
    }),
    [data, isFetching, isLoading, isUninitialized, requestedAccountIds.length],
  )
}
