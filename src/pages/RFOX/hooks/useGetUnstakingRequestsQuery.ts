import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { arbitrumChainId, toAccountId } from '@shapeshiftoss/caip'
import { RFOX_ABI, viemClientByNetworkId } from '@shapeshiftoss/contracts'
import type { UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQueries, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { multicall } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import { serialize } from 'wagmi'

import { getStakingAssetId, getStakingContract } from '../helpers'
import {
  getUnstakingRequestCountQueryFn,
  getUnstakingRequestCountQueryKey,
} from './useGetUnstakingRequestCountQuery'

import { isSome } from '@/lib/utils'
import { supportedStakingAssetIds } from '@/pages/RFOX/hooks/useRfoxContext'
import { mergeQueryOutputs } from '@/react-queries/helpers'

const getContractFnParams = (
  stakingAssetAccountAddress: string | undefined,
  count: bigint,
  contractAddress: Address,
) => {
  if (!stakingAssetAccountAddress) return []

  return Array.from({ length: Number(count) }, (_, index) => {
    return {
      abi: RFOX_ABI,
      address: contractAddress,
      functionName: 'getUnstakingRequest',
      args: [getAddress(stakingAssetAccountAddress), BigInt(index)],
      chainId: arbitrum.id,
    } as const
  })
}

type GetUnstakingRequestsQueryKey = [string, { fnParams: string }]

export type UnstakingRequest = {
  amountCryptoBaseUnit: string
  cooldownExpiry: string
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId
  index: number
  id: string
}

type UnstakingRequests = UnstakingRequest[]

type UseGetUnstakingRequestsQueryProps<SelectData = UnstakingRequests> = {
  stakingAssetAccountAddress: string | undefined
  select?: (unstakingRequests: UnstakingRequests) => SelectData
}

const client = viemClientByNetworkId[arbitrum.id]

export const useGetUnstakingRequestsQuery = <SelectData = UnstakingRequests>({
  stakingAssetAccountAddress,
  select,
}: UseGetUnstakingRequestsQueryProps<SelectData>) => {
  const unstakingRequestCountQueries = useMemo(() => {
    return supportedStakingAssetIds.map(
      stakingAssetId =>
        ({
          queryKey: getUnstakingRequestCountQueryKey({
            stakingAssetAccountAddress,
            stakingAssetId,
          }),
          queryFn: getUnstakingRequestCountQueryFn({ stakingAssetAccountAddress, stakingAssetId }),
        }) as const,
    )
  }, [stakingAssetAccountAddress])

  const combine = useCallback(
    (queries: UseQueryResult<bigint, Error>[]) => {
      const combineResults = (results: (bigint | undefined)[]) => {
        return results.flatMap((result, i) => {
          return getContractFnParams(
            stakingAssetAccountAddress,
            result ?? 0n,
            getStakingContract(supportedStakingAssetIds[i]),
          )
        })
      }

      return mergeQueryOutputs(queries, combineResults)
    },
    [stakingAssetAccountAddress],
  )

  const fnParamsQuery = useQueries({
    queries: unstakingRequestCountQueries,
    combine,
  })

  const queryKey: GetUnstakingRequestsQueryKey = useMemo(
    () => [
      'unstakingRequests',
      {
        fnParams: serialize(fnParamsQuery.data),
      },
    ],
    [fnParamsQuery],
  )

  const queryFn = useMemo(() => {
    if (fnParamsQuery.isPending || fnParamsQuery.isLoading || stakingAssetAccountAddress)
      return skipToken

    // We have an error in unstaking request count- no point to fire a query for unstaking request, but we can't simply skipToken either - else this query would be in a perma-pending state
    // until staleTime/gcTime elapses on the dependant query. Propagates the error instead.
    if (fnParamsQuery.isError) return () => Promise.reject(fnParamsQuery.error)

    // We have a successful response for unstaking request count, but there are no unstaking requests
    // We don't need to fire an *XHR* as we already know what the response would be (an empty array), but still need to fire a *query*, resolving immediately with said known response.
    if (!fnParamsQuery.data.length) return () => Promise.resolve([])

    return async () => {
      const contracts = fnParamsQuery.data

      const responses = await multicall(client, { contracts })

      return responses
        .map(({ result }, i) => {
          if (!stakingAssetAccountAddress) return null
          if (!result) return null

          const contractAddress = contracts[i].address

          // getUnstakingRequest(account address, index uint256)
          const index = Number(contracts[i].args[1])

          return {
            unstakingBalance: result.unstakingBalance.toString(),
            cooldownExpiry: result.cooldownExpiry.toString(),
            stakingAssetId: getStakingAssetId(contractAddress),
            index,
            // composite ID to ensure uniqueness of unstaking requests, to be used for lookups
            // cooldownExpiry should be a unique enough index, since it's based on blockTime, and users are *not* going to be able to make
            // two unstaking requests in in one block. But for the sake of paranoia, we make it a composite ID with index too
            // Which itself *is* unique at any given time, though as users unstake/claim, it may change due to the inner workings of solidity, as
            // indexes can reorg
            id: `${index}-${result.cooldownExpiry}-${contractAddress}`,
            stakingAssetAccountId: toAccountId({
              account: stakingAssetAccountAddress,
              chainId: arbitrumChainId,
            }),
          }
        })
        .filter(isSome)
    }
  }, [fnParamsQuery, stakingAssetAccountAddress])

  const unstakingRequestsQuery = useQuery({
    queryKey,
    queryFn,
    select,
    retry: false,
  })

  return { ...unstakingRequestsQuery, queryKey }
}
