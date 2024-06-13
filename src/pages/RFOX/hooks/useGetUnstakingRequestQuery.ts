import { skipToken } from '@tanstack/react-query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useMemo } from 'react'
import { type Address, getAddress, type MulticallReturnType } from 'viem'
import { multicall } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import type { Config } from 'wagmi'
import { type ReadContractsQueryKey, useQuery } from 'wagmi/query'
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

type GetUnstakingRequestQueryKey = ReadContractsQueryKey<[Address, bigint], AllowFailure, Config>

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
  const { data: unstakingRequestCountResponse } = useGetUnstakingRequestCountQuery({
    stakingAssetAccountAddress,
  })

  const contracts = useMemo(
    () =>
      stakingAssetAccountAddress
        ? Array.from(
            { length: Number(unstakingRequestCountResponse) },
            (_, index) =>
              ({
                abi: foxStakingV1Abi,
                address: RFOX_PROXY_CONTRACT_ADDRESS,
                functionName: 'getUnstakingRequest',
                args: [getAddress(stakingAssetAccountAddress), index],
                chainId: arbitrum.id,
              }) as const,
          )
        : [],
    [stakingAssetAccountAddress, unstakingRequestCountResponse],
  )

  // wagmi doesn't expose queryFn, so we reconstruct the queryKey and queryFn ourselves to leverage skipToken type safety
  const queryKey: GetUnstakingRequestQueryKey = useMemo(
    () => [
      'readContracts',
      {
        contracts,
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
  })

  return unstakingRequestQuery
}
