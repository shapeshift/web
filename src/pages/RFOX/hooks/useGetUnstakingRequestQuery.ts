import { skipToken, useQuery } from '@tanstack/react-query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
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

type GetUnstakingRequestQueryKey = [string, { contracts: string }]

type UnstakingRequest = MulticallReturnType<GetContractsReturnType, AllowFailure>

type UseGetUnstakingRequestQueryProps<SelectData = UnstakingRequest> = {
  stakingAssetAccountAddress: string | undefined
  select?: (unstakingRequest: UnstakingRequest) => SelectData
}

const client = viemClientByNetworkId[arbitrum.id]

export const useGetUnstakingRequestQuery = <SelectData = UnstakingRequest>({
  stakingAssetAccountAddress,
  select,
}: UseGetUnstakingRequestQueryProps<SelectData>) => {
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
  const queryKey: GetUnstakingRequestQueryKey = useMemo(
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

  const getUnstakingRequestQueryFn = useMemo(
    () =>
      unstakingRequestCountResponse && unstakingRequestCountResponse?.valueOf() > 0n
        ? () =>
            multicall(client, {
              contracts,
            }).then(r => r.map(response => response.result).filter(isSome))
        : skipToken,
    [contracts, unstakingRequestCountResponse],
  )

  const unstakingRequestQuery = useQuery({
    queryKey,
    queryFn: getUnstakingRequestQueryFn,
    select,
    retry: false,
  })

  const isError = isUnstakingRequestCountError || unstakingRequestQuery.isError

  return unstakingRequestQuery
}
