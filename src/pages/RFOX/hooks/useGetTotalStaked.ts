import type { AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { rfoxAbi } from 'contracts/abis/rfoxAbi'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { useMemo } from 'react'
import type { Address } from 'viem'
import { getContract } from 'viem'
import { arbitrum } from 'viem/chains'
import { viemClientByNetworkId } from 'lib/viem-client'

const client = viemClientByNetworkId[arbitrum.id]

const contract = getContract({
  address: RFOX_PROXY_CONTRACT_ADDRESS,
  abi: rfoxAbi,
  client,
})

type TotalStakedQueryKey = [
  'totalStaked',
  { chainId: number; contractAddress: Address; stakingAssetId: AssetId },
]

type TotalStaked = bigint

type UseTotalStakedQueryProps<SelectData = TotalStaked> = {
  stakingAssetId: AssetId
  select?: (totalStaked: bigint) => SelectData
}

export const getTotalStakedQueryKey = ({
  stakingAssetId,
}: UseTotalStakedQueryProps): TotalStakedQueryKey => [
  'totalStaked',
  {
    chainId: arbitrum.id,
    contractAddress: RFOX_PROXY_CONTRACT_ADDRESS,
    stakingAssetId,
  },
]

export const getTotalStakedQueryFn = () => {
  return contract.read.totalStaked()
}

export const useTotalStakedQuery = <SelectData = TotalStaked>({
  stakingAssetId,
  select,
}: UseTotalStakedQueryProps<SelectData>) => {
  const queryKey: TotalStakedQueryKey = useMemo(() => {
    return getTotalStakedQueryKey({ stakingAssetId })
  }, [stakingAssetId])

  return useQuery({
    queryKey,
    queryFn: getTotalStakedQueryFn,
    select,
  })
}
