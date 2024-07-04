import { skipToken, useQuery } from '@tanstack/react-query'
import type { ReadContractQueryKey } from '@wagmi/core/query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { readContract } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import type { Config } from 'wagmi'
import { viemClientByNetworkId } from 'lib/viem-client'

import type { AbiStakingInfo } from '../types'

type StakingInfoQueryKey = ReadContractQueryKey<
  typeof foxStakingV1Abi,
  'stakingInfo',
  readonly [Address],
  Config
>

type UseStakingInfoQueryProps<SelectData = AbiStakingInfo> = {
  stakingAssetAccountAddress: string | undefined
  select?: (stakingInfo: AbiStakingInfo) => SelectData
}
const client = viemClientByNetworkId[arbitrum.id]

export const useStakingInfoQuery = <SelectData = AbiStakingInfo>({
  stakingAssetAccountAddress,
  select,
}: UseStakingInfoQueryProps<SelectData>) => {
  // wagmi doesn't expose queryFn, so we reconstruct the queryKey and queryFn ourselves to leverage skipToken type safety
  const queryKey: StakingInfoQueryKey = useMemo(
    () => [
      'readContract',
      {
        address: RFOX_PROXY_CONTRACT_ADDRESS,
        functionName: 'stakingInfo',
        args: [
          stakingAssetAccountAddress ? getAddress(stakingAssetAccountAddress) : ('' as Address),
        ],
        chainId: arbitrum.id,
      },
    ],
    [stakingAssetAccountAddress],
  )

  const stakingInfoQueryFn = useMemo(
    () =>
      stakingAssetAccountAddress
        ? () =>
            readContract(client, {
              abi: foxStakingV1Abi,
              address: RFOX_PROXY_CONTRACT_ADDRESS,
              functionName: 'stakingInfo',
              args: [getAddress(stakingAssetAccountAddress)],
            })
        : skipToken,
    [stakingAssetAccountAddress],
  )

  const stakingInfoQuery = useQuery({
    queryKey,
    queryFn: stakingInfoQueryFn,
    select,
  })

  return { ...stakingInfoQuery, queryKey }
}
