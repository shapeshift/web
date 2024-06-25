import { skipToken, useQuery } from '@tanstack/react-query'
import type { ReadContractQueryKey } from '@wagmi/core/query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useMemo } from 'react'
import type { Address, ReadContractReturnType } from 'viem'
import { getAddress } from 'viem'
import { readContract } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import type { Config } from 'wagmi'
import { viemClientByNetworkId } from 'lib/viem-client'

type GetUnstakingRequestCountQueryKey = ReadContractQueryKey<
  typeof foxStakingV1Abi,
  'getUnstakingRequestCount',
  readonly [Address],
  Config
>
type UnstakingRequestCount = ReadContractReturnType<
  typeof foxStakingV1Abi,
  'getUnstakingRequestCount',
  readonly [Address]
>
type UseGetUnstakingRequestCountQueryProps<SelectData = UnstakingRequestCount> = {
  stakingAssetAccountAddress: string | undefined
  select?: (unstakingRequestCount: UnstakingRequestCount) => SelectData
}
const client = viemClientByNetworkId[arbitrum.id]

export const useGetUnstakingRequestCountQuery = <SelectData = UnstakingRequestCount>({
  stakingAssetAccountAddress,
  select,
}: UseGetUnstakingRequestCountQueryProps<SelectData>) => {
  // wagmi doesn't expose queryFn, so we reconstruct the queryKey and queryFn ourselves to leverage skipToken type safety
  const queryKey: GetUnstakingRequestCountQueryKey = useMemo(
    () => [
      'readContract',
      {
        address: RFOX_PROXY_CONTRACT_ADDRESS,
        functionName: 'getUnstakingRequestCount',
        args: [
          stakingAssetAccountAddress ? getAddress(stakingAssetAccountAddress) : ('' as Address),
        ],
        chainId: arbitrum.id,
      },
    ],
    [stakingAssetAccountAddress],
  )

  const getUnstakingRequestCountQueryFn = useMemo(
    () =>
      stakingAssetAccountAddress
        ? () =>
            readContract(client, {
              abi: foxStakingV1Abi,
              address: RFOX_PROXY_CONTRACT_ADDRESS,
              functionName: 'getUnstakingRequestCount',
              args: [getAddress(stakingAssetAccountAddress)],
            })
        : skipToken,
    [stakingAssetAccountAddress],
  )

  const unstakingRequestCountQuery = useQuery({
    queryKey,
    queryFn: getUnstakingRequestCountQueryFn,
    select,
    retry: false,
  })

  return unstakingRequestCountQuery
}
