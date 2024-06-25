import { skipToken, useQuery } from '@tanstack/react-query'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { readContract } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import { serialize } from 'wagmi'
import { viemClientByNetworkId } from 'lib/viem-client'

type EarnedQueryKey = ['readContract', string]

type UseStakingInfoQueryProps = {
  stakingAssetAccountAddress: string | undefined
  blockNumber: bigint | undefined
}

const client = viemClientByNetworkId[arbitrum.id]

export const getEarnedQueryKey = ({
  stakingAssetAccountAddress,
  blockNumber,
}: UseStakingInfoQueryProps): EarnedQueryKey => [
  'readContract',
  serialize({
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'earned',
    args: [stakingAssetAccountAddress ? getAddress(stakingAssetAccountAddress) : ('' as Address)],
    chainId: arbitrum.id,
    blockNumber,
  }),
]

export const getEarnedQueryFn = ({
  stakingAssetAccountAddress,
  blockNumber,
}: UseStakingInfoQueryProps) =>
  stakingAssetAccountAddress
    ? () =>
        readContract(client, {
          abi: foxStakingV1Abi,
          address: RFOX_PROXY_CONTRACT_ADDRESS,
          functionName: 'earned',
          args: [getAddress(stakingAssetAccountAddress)],
          blockNumber,
        })
    : skipToken

export const useEarnedQuery = ({
  stakingAssetAccountAddress,
  blockNumber,
}: UseStakingInfoQueryProps) => {
  // wagmi doesn't expose queryFn, so we reconstruct the queryKey and queryFn ourselves to leverage skipToken type safety
  const queryKey: EarnedQueryKey = useMemo(
    () =>
      getEarnedQueryKey({
        stakingAssetAccountAddress,
        blockNumber,
      }),
    [blockNumber, stakingAssetAccountAddress],
  )

  const stakingInfoQueryFn = useMemo(
    () =>
      getEarnedQueryFn({
        stakingAssetAccountAddress,
        blockNumber,
      }),
    [blockNumber, stakingAssetAccountAddress],
  )

  const stakingInfoQuery = useQuery({
    queryKey,
    queryFn: stakingInfoQueryFn,
  })

  return stakingInfoQuery
}
