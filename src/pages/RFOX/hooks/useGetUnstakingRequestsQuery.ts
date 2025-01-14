import type { AssetId } from '@shapeshiftoss/caip'
import { RFOX_ABI, viemClientByNetworkId } from '@shapeshiftoss/contracts'
import type { UseQueryResult } from '@tanstack/react-query'
import { skipToken, useQueries, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { mergeQueryOutputs } from 'react-queries/helpers'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { multicall } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import { serialize } from 'wagmi'
import { isSome } from 'lib/utils'

import { getStakingAssetId, getStakingContract } from '../helpers'
import {
  getUnstakingRequestCountQueryFn,
  getUnstakingRequestCountQueryKey,
} from './useGetUnstakingRequestCountQuery'
import { useRFOXContext } from './useRfoxContext'

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

type UnstakingRequests = {
  unstakingBalance: bigint
  cooldownExpiry: bigint
  stakingAssetId: AssetId
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
  const { supportedStakingAssetIds } = useRFOXContext()

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
  }, [supportedStakingAssetIds, stakingAssetAccountAddress])

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
    [stakingAssetAccountAddress, supportedStakingAssetIds],
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
    if (fnParamsQuery.isPending || fnParamsQuery.isLoading) return skipToken

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
          if (!result) return null

          const contractAddress = contracts[i].address

          // getUnstakingRequest(account address, index uint256)
          const index = Number(contracts[i].args[1])

          return {
            unstakingBalance: result.unstakingBalance,
            cooldownExpiry: result.cooldownExpiry,
            stakingAssetId: getStakingAssetId(contractAddress),
            index,
          }
        })
        .filter(isSome)
    }
  }, [fnParamsQuery])

  const unstakingRequestsQuery = useQuery({
    queryKey,
    queryFn,
    select,
    retry: false,
  })

  return { ...unstakingRequestsQuery, queryKey }
}
