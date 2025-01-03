import {
  RFOX_ABI,
  RFOX_LP_PROXY_CONTRACT,
  RFOX_PROXY_CONTRACT,
  viemClientByNetworkId,
} from '@shapeshiftoss/contracts'
import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { multicall } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import { serialize } from 'wagmi'
import { isSome } from 'lib/utils'

import { useGetUnstakingRequestCountQuery } from './useGetUnstakingRequestCountQuery'

const getContracts = (
  stakingAssetAccountAddress: string | undefined,
  count: bigint,
  contractAddress: Address = RFOX_PROXY_CONTRACT,
) =>
  stakingAssetAccountAddress
    ? Array.from(
        { length: Number(count) },
        (_, index) =>
          ({
            abi: RFOX_ABI,
            address: contractAddress,
            functionName: 'getUnstakingRequest',
            args: [getAddress(stakingAssetAccountAddress), BigInt(index)],
            chainId: arbitrum.id,
          }) as const,
      )
    : []

type GetUnstakingRequestsQueryKey = [string, { contracts: string }]

type UnstakingRequests = {
  unstakingBalance: bigint
  cooldownExpiry: bigint
  contractAddress: Address
  index: number
}[]

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

  const {
    data: lpUnstakingRequestCountResponse,
    isError: isLpUnstakingRequestCountError,
    isLoading: isLpUnstakingRequestCountLoading,
    isPending: isLpUnstakingRequestCountPending,
    error: lpUnstakingRequestCountError,
  } = useGetUnstakingRequestCountQuery({
    stakingAssetAccountAddress,
    contractAddress: RFOX_LP_PROXY_CONTRACT,
  })

  const contracts = useMemo(() => {
    const foxContracts = getContracts(
      stakingAssetAccountAddress,
      unstakingRequestCountResponse ?? 0n,
    )
    const lpContracts = getContracts(
      stakingAssetAccountAddress,
      lpUnstakingRequestCountResponse ?? 0n,
      RFOX_LP_PROXY_CONTRACT,
    )
    return [...foxContracts, ...lpContracts]
  }, [stakingAssetAccountAddress, unstakingRequestCountResponse, lpUnstakingRequestCountResponse])

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
    if (
      isUnstakingRequestCountLoading ||
      isUnstakingRequestCountPending ||
      isLpUnstakingRequestCountLoading ||
      isLpUnstakingRequestCountPending
    )
      return skipToken
    // We have an error in unstaking request count- no point to fire a query for unstaking request, but we can't simply skipToken either - else this query would be in a perma-pending state
    // until staleTime/gcTime elapses on the dependant query. Propagates the error instead.
    if (isUnstakingRequestCountError) return () => Promise.reject(unstakingRequestCountError)
    if (isLpUnstakingRequestCountError) return () => Promise.reject(lpUnstakingRequestCountError)
    // We have a successful response for unstaking request count, but it's a 0-count.
    // We don't need to fire an *XHR* as we already know what the response would be (an empty array), but still need to fire a *query*, resolving immediately with said known response.
    if (unstakingRequestCountResponse === 0n) return () => Promise.resolve([])
    if (lpUnstakingRequestCountResponse === 0n) return () => Promise.resolve([])
    return () =>
      multicall(client, {
        contracts,
      }).then(r =>
        r
          .map((response, globalIndex) => {
            if (!response.result) return null

            const contractAddress = contracts[globalIndex].address

            // As we have two contracts, we need to calculate the relative index of the unstaking request
            // as the index on chain are relative to the particular contract
            const localIndex = globalIndex - contracts.findIndex(c => c.address === contractAddress)

            return {
              unstakingBalance: response.result.unstakingBalance,
              cooldownExpiry: response.result.cooldownExpiry,
              contractAddress,
              index: localIndex,
            }
          })
          .filter(isSome),
      )
  }, [
    contracts,
    isUnstakingRequestCountError,
    isUnstakingRequestCountLoading,
    isUnstakingRequestCountPending,
    isLpUnstakingRequestCountError,
    isLpUnstakingRequestCountLoading,
    isLpUnstakingRequestCountPending,
    unstakingRequestCountError,
    unstakingRequestCountResponse,
    lpUnstakingRequestCountError,
    lpUnstakingRequestCountResponse,
  ])

  const unstakingRequestsQuery = useQuery({
    queryKey,
    queryFn: getUnstakingRequestsQueryFn,
    select,
    retry: false,
  })

  return { ...unstakingRequestsQuery, queryKey }
}
