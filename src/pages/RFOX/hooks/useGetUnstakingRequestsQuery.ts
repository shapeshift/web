import { foxStakingV1Abi, RFOX_PROXY_CONTRACT_ADDRESS } from '@shapeshiftoss/contracts'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getAddress, type MulticallReturnType } from 'viem'
import { multicall } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import { serialize } from 'wagmi'
import { isSome } from 'lib/utils'
import { viemClientByNetworkId } from 'lib/viem-client'

import { useGetUnstakingRequestCountQuery } from './useGetUnstakingRequestCountQuery'

type AllowFailure = false

const getContracts = (stakingAssetAccountAddress: string | undefined, count: bigint) =>
  stakingAssetAccountAddress
    ? Array.from(
        { length: Number(count) },
        (_, index) =>
          ({
            abi: foxStakingV1Abi,
            address: RFOX_PROXY_CONTRACT_ADDRESS,
            functionName: 'getUnstakingRequest',
            args: [getAddress(stakingAssetAccountAddress), BigInt(index)],
            chainId: arbitrum.id,
          }) as const,
      )
    : []

type GetContractsReturnType = ReturnType<typeof getContracts>

type GetUnstakingRequestsQueryKey = [string, { contracts: string }]

type UnstakingRequests = MulticallReturnType<GetContractsReturnType, AllowFailure>

type UseGetUnstakingRequestsQueryProps<SelectData = UnstakingRequests> = {
  stakingAssetAccountAddress: string | undefined
  select?: (unstakingRequests: UnstakingRequests) => SelectData
}

const client = viemClientByNetworkId[arbitrum.id]

export const useGetUnstakingRequestsQuery = <SelectData = UnstakingRequests>({
  stakingAssetAccountAddress,
  select,
}: UseGetUnstakingRequestsQueryProps<SelectData>) => {
  const {
    data: unstakingRequestCountResponse,
    isError: isUnstakingRequestCountError,
    isLoading: isUnstakingRequestCountLoading,
    isPending: isUnstakingRequestCountPending,
    error: unstakingRequestCountError,
  } = useGetUnstakingRequestCountQuery({
    stakingAssetAccountAddress,
  })

  const contracts = useMemo(
    () => getContracts(stakingAssetAccountAddress, unstakingRequestCountResponse ?? 0n),
    [stakingAssetAccountAddress, unstakingRequestCountResponse],
  )

  // wagmi doesn't expose queryFn, so we reconstruct the queryKey and queryFn ourselves to leverage skipToken type safety
  const queryKey: GetUnstakingRequestsQueryKey = useMemo(
    () => [
      'readContracts',
      {
        // avoids throws on unserializable BigInts, this is the same wagmi useQuery() is doing in their internal useQuery flavor
        // but we can't use it because they're still stuck on v4 of react-query, whereas skipToken support is only available starting from v5.25
        // https://wagmi.sh/react/api/utilities/serialize
        contracts: serialize(contracts),
      },
    ],
    [contracts],
  )

  const getUnstakingRequestsQueryFn = useMemo(() => {
    // Unstaking request count is actually loading/pending, fine not to fire a *query* for unstaking request here just yet and skipToken
    // this query will be in pending state, which is correct.
    if (isUnstakingRequestCountLoading || isUnstakingRequestCountPending) return skipToken
    // We have an error in unstaking request count- no point to fire a query for unstaking request, but we can't simply skipToken either - else this query would be in a perma-pending state
    // until staleTime/gcTime elapses on the dependant query. Propagates the error instead.
    if (isUnstakingRequestCountError) return () => Promise.reject(unstakingRequestCountError)
    // We have a successful response for unstaking request count, but it's a 0-count.
    // We don't need to fire an *XHR* as we already know what the response would be (an empty array), but still need to fire a *query*, resolving immediately with said known response.
    if (unstakingRequestCountResponse === 0n) return () => Promise.resolve([])

    return () =>
      multicall(client, {
        contracts,
      }).then(r => r.map(response => response.result).filter(isSome))
  }, [
    contracts,
    isUnstakingRequestCountError,
    isUnstakingRequestCountLoading,
    isUnstakingRequestCountPending,
    unstakingRequestCountError,
    unstakingRequestCountResponse,
  ])

  const unstakingRequestsQuery = useQuery({
    queryKey,
    queryFn: getUnstakingRequestsQueryFn,
    select,
    retry: false,
  })

  return { ...unstakingRequestsQuery, queryKey }
}
