import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { viemClientByNetworkId } from '@shapeshiftoss/contracts'
import { skipToken, useQuery } from '@tanstack/react-query'
import type { ReadContractQueryKey } from '@wagmi/core/query'
import { useMemo } from 'react'
import type { Address, ReadContractReturnType } from 'viem'
import { erc20Abi, getAddress } from 'viem'
import { readContract } from 'viem/actions'
import { arbitrum } from 'viem/chains'
import type { Config } from 'wagmi'

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

export const getStakingBalanceOfQueryKey = ({
  stakingAssetAccountAddress,
  stakingAssetId,
}: {
  stakingAssetAccountAddress: string | undefined
  stakingAssetId: AssetId | undefined
}): StakingBalanceOfQueryKey => [
  'readContract',
  {
    address: stakingAssetId
      ? getAddress(fromAssetId(stakingAssetId).assetReference)
      : ('' as Address),
    functionName: 'balanceOf',
    args: [stakingAssetAccountAddress ? getAddress(stakingAssetAccountAddress) : ('' as Address)],
    chainId: arbitrum.id,
  },
]

export const getStakingBalanceOfQueryFn = ({
  stakingAssetAccountAddress,
  stakingAssetId,
}: {
  stakingAssetAccountAddress: string
  stakingAssetId: AssetId
}) => {
  return readContract(client, {
    abi: erc20Abi,
    address: getAddress(fromAssetId(stakingAssetId).assetReference),
    functionName: 'balanceOf',
    args: [getAddress(stakingAssetAccountAddress)],
  })
}

export const useStakingBalanceOfQuery = <SelectData = StakingBalanceOf>({
  stakingAssetAccountAddress,
  stakingAssetId,
  select,
  enabled = true,
}: UseStakingBalanceOfQueryProps<SelectData>) => {
  const queryKey = useMemo(() => {
    return getStakingBalanceOfQueryKey({ stakingAssetAccountAddress, stakingAssetId })
  }, [stakingAssetAccountAddress, stakingAssetId])

  const queryFn = useMemo(
    () =>
      enabled && stakingAssetAccountAddress && stakingAssetId
        ? () => getStakingBalanceOfQueryFn({ stakingAssetAccountAddress, stakingAssetId })
        : skipToken,
    [enabled, stakingAssetAccountAddress, stakingAssetId],
  )

  return useQuery({
    queryKey,
    queryFn,
    select,
  })
}
