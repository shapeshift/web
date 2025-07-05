import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
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
  accountId: AccountId | undefined
  stakingAssetId: AssetId | undefined
  select?: (stakingBalanceOf: StakingBalanceOf) => SelectData
  enabled?: boolean
}
const client = viemClientByNetworkId[arbitrum.id]

export const getStakingBalanceOfQueryKey = ({
  accountId,
  stakingAssetId,
}: {
  accountId: AccountId | undefined
  stakingAssetId: AssetId | undefined
}): StakingBalanceOfQueryKey => [
  'readContract',
  {
    address: stakingAssetId
      ? getAddress(fromAssetId(stakingAssetId).assetReference)
      : ('' as Address),
    functionName: 'balanceOf',
    args: [accountId ? getAddress(fromAccountId(accountId).account) : ('' as Address)],
    chainId: arbitrum.id,
  },
]

export const getStakingBalanceOfQueryFn = ({
  accountId,
  stakingAssetId,
}: {
  accountId: AccountId
  stakingAssetId: AssetId
}) => {
  return readContract(client, {
    abi: erc20Abi,
    address: getAddress(fromAssetId(stakingAssetId).assetReference),
    functionName: 'balanceOf',
    args: [getAddress(fromAccountId(accountId).account)],
  })
}

export const useStakingBalanceOfQuery = <SelectData = StakingBalanceOf>({
  accountId,
  stakingAssetId,
  select,
  enabled = true,
}: UseStakingBalanceOfQueryProps<SelectData>) => {
  const queryKey = useMemo(() => {
    return getStakingBalanceOfQueryKey({
      accountId,
      stakingAssetId,
    })
  }, [accountId, stakingAssetId])

  const queryFn = useMemo(
    () =>
      enabled && accountId && stakingAssetId
        ? () =>
            getStakingBalanceOfQueryFn({
              accountId,
              stakingAssetId,
            })
        : skipToken,
    [enabled, accountId, stakingAssetId],
  )

  return useQuery({
    queryKey,
    queryFn,
    select,
  })
}
