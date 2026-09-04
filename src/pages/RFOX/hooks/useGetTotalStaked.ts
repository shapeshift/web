import type { AssetId } from '@shapeshiftoss/caip'
import { RFOX_ABI } from '@shapeshiftoss/contracts'
import { useReadContract } from 'wagmi'

import { getRfoxNetworkId, getStakingContract } from '../helpers'

type TotalStaked = bigint

type UseTotalStakedQueryProps<SelectData = TotalStaked> = {
  stakingAssetId: AssetId
  select?: (totalStaked: bigint) => SelectData
}

export const useTotalStakedQuery = <SelectData = TotalStaked>({
  stakingAssetId,
  select,
}: UseTotalStakedQueryProps<SelectData>) => {
  return useReadContract({
    abi: RFOX_ABI,
    address: getStakingContract(stakingAssetId),
    functionName: 'totalStaked',
    chainId: getRfoxNetworkId(stakingAssetId),
    query: {
      select,
    },
  })
}
