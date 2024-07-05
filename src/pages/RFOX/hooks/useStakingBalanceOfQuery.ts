import { type AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { skipToken, useQuery } from '@tanstack/react-query'
import type { ReadContractQueryKey } from '@wagmi/core/query'
import { useMemo } from 'react'
import type { Address, ReadContractReturnType } from 'viem'
import { erc20Abi, getAddress } from 'viem'
import { readContract } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import type { Config } from 'wagmi'
import { viemClientByNetworkId } from 'lib/viem-client'

type StakingBalanceOfQueryKey = ReadContractQueryKey<
  typeof erc20Abi,
  'balanceOf',
  readonly [Address],
  Config
>
type StakingBalanceOf = ReadContractReturnType<typeof erc20Abi, 'balanceOf', readonly [Address]>
type UseStakingBalanceOfQueryProps<SelectData = StakingBalanceOf> = {
  stakingAssetAccountAddress: string | undefined
  stakingAssetId: AssetId | undefined
  select?: (stakingBalanceOf: StakingBalanceOf) => SelectData
  enabled?: boolean
}
const client = viemClientByNetworkId[arbitrum.id]

export const useStakingBalanceOfQuery = <SelectData = StakingBalanceOf>({
  stakingAssetAccountAddress,
  stakingAssetId,
  select,
  enabled = true,
}: UseStakingBalanceOfQueryProps<SelectData>) => {
  // wagmi doesn't expose queryFn, so we reconstruct the queryKey and queryFn ourselves to leverage skipToken type safety
  const queryKey: StakingBalanceOfQueryKey = useMemo(() => {
    return [
      'readContract',
      {
        address: stakingAssetId
          ? getAddress(fromAssetId(stakingAssetId).assetReference)
          : ('' as Address),
        functionName: 'balanceOf',
        args: [
          stakingAssetAccountAddress ? getAddress(stakingAssetAccountAddress) : ('' as Address),
        ],
        chainId: arbitrum.id,
      },
    ]
  }, [stakingAssetAccountAddress, stakingAssetId])

  const stakingBalanceOfQueryFn = useMemo(
    () =>
      enabled && stakingAssetAccountAddress && stakingAssetId
        ? () =>
            readContract(client, {
              abi: erc20Abi,
              address: getAddress(fromAssetId(stakingAssetId).assetReference),
              functionName: 'balanceOf',
              args: [getAddress(stakingAssetAccountAddress)],
            })
        : skipToken,
    [enabled, stakingAssetAccountAddress, stakingAssetId],
  )

  const stakingBalanceOfQuery = useQuery({
    queryKey,
    queryFn: stakingBalanceOfQueryFn,
    select,
  })

  return { ...stakingBalanceOfQuery, queryKey }
}
