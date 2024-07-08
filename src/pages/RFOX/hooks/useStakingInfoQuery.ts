import { skipToken, useQuery } from '@tanstack/react-query'
import { getConfig } from 'config'
import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { getAddress } from 'viem'
import { readContract } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import { viemClientByNetworkId } from 'lib/viem-client'

import type { AbiStakingInfo } from '../types'

export type StakingInfoQueryKey = [
  'readContract',
  {
    address: string
    functionName: 'stakingInfo'
    args: [string]
    chainId: number
    blockNumber: string | undefined
  },
]

type StakingInfoQueryFn = () => Promise<AbiStakingInfo>

type UseStakingInfoQueryProps<SelectData = AbiStakingInfo> = {
  stakingAssetAccountAddress: string | undefined
  select?: (stakingInfo: AbiStakingInfo) => SelectData
}
const client = viemClientByNetworkId[arbitrum.id]

export const getReadStakingInfoQueryKey = (
  stakingAssetAccountAddress: string | undefined,
  blockNumber: bigint | undefined,
): StakingInfoQueryKey => {
  return [
    'readContract',
    {
      address: RFOX_PROXY_CONTRACT_ADDRESS,
      functionName: 'stakingInfo',
      args: [stakingAssetAccountAddress ? getAddress(stakingAssetAccountAddress) : ('' as Address)],
      chainId: arbitrum.id,
      blockNumber: blockNumber?.toString(), // stringifying bigint to avoid 'Do not know how to serialize a BigInt'
    },
  ]
}

export const getReadStakingInfoQueryFn = (
  stakingAssetAccountAddress: string,
  blockNumber: bigint | undefined,
): StakingInfoQueryFn => {
  return () =>
    readContract(client, {
      abi: foxStakingV1Abi,
      address: RFOX_PROXY_CONTRACT_ADDRESS,
      functionName: 'stakingInfo',
      args: [getAddress(stakingAssetAccountAddress)],
      blockNumber,
    }).catch(e => {
      const isRfoxMockRewardsTxHistoryEnabled =
        getConfig().REACT_APP_FEATURE_RFOX_MOCK_REWARDS_TX_HISTORY

      // Reverts are expected in the case the contract didnt exist at the blockNumber requested
      // In the case of testing, return the would-be default solidty response for us to backfill with mock data
      if (isRfoxMockRewardsTxHistoryEnabled) {
        return [0n, 0n, 0n, 0n, ''] as AbiStakingInfo
      }

      // Otherwise, something is wrong so throw the error
      throw e
    })
}

export const useStakingInfoQuery = <SelectData = AbiStakingInfo>({
  stakingAssetAccountAddress,
  select,
}: UseStakingInfoQueryProps<SelectData>) => {
  // wagmi doesn't expose queryFn, so we reconstruct the queryKey and queryFn ourselves to leverage skipToken type safety
  const queryKey: StakingInfoQueryKey = useMemo(
    () => getReadStakingInfoQueryKey(stakingAssetAccountAddress, undefined),
    [stakingAssetAccountAddress],
  )

  const stakingInfoQueryFn = useMemo(
    () =>
      stakingAssetAccountAddress
        ? getReadStakingInfoQueryFn(stakingAssetAccountAddress, undefined)
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
