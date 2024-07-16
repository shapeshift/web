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

type UseEarnedQueryProps = {
  stakingAssetAccountAddress: string | undefined
}

const client = viemClientByNetworkId[arbitrum.id]

export const getEarnedQueryKey = ({
  stakingAssetAccountAddress,
}: UseEarnedQueryProps): EarnedQueryKey => [
  'readContract',
  serialize({
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'earned',
    args: [stakingAssetAccountAddress ? getAddress(stakingAssetAccountAddress) : ('' as Address)],
    chainId: arbitrum.id,
  }),
]

export const getEarnedQueryFn = ({ stakingAssetAccountAddress }: UseEarnedQueryProps) =>
  stakingAssetAccountAddress
    ? async () =>
        await readContract(client, {
          abi: foxStakingV1Abi,
          address: RFOX_PROXY_CONTRACT_ADDRESS,
          functionName: 'earned',
          args: [getAddress(stakingAssetAccountAddress)],
          blockNumber: undefined, // use the latest block - archive node not allowed
        }).catch((error: unknown) => {
          console.error(error)
          return 0n
        })
    : skipToken

export const useEarnedQuery = ({ stakingAssetAccountAddress }: UseEarnedQueryProps) => {
  // wagmi doesn't expose queryFn, so we reconstruct the queryKey and queryFn ourselves to leverage skipToken type safety
  const queryKey: EarnedQueryKey = useMemo(
    () =>
      getEarnedQueryKey({
        stakingAssetAccountAddress,
      }),
    [stakingAssetAccountAddress],
  )

  const queryFn = useMemo(
    () =>
      getEarnedQueryFn({
        stakingAssetAccountAddress,
      }),
    [stakingAssetAccountAddress],
  )

  const query = useQuery({
    queryKey,
    queryFn,
    enabled: stakingAssetAccountAddress !== undefined,
  })

  return query
}
