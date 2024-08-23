import { foxStakingV1Abi, RFOX_PROXY_CONTRACT_ADDRESS } from '@shapeshiftoss/contracts'
import { arbitrum } from 'viem/chains'
import { useReadContract } from 'wagmi'

type TotalStaked = bigint

type UseTotalStakedQueryProps<SelectData = TotalStaked> = {
  select?: (totalStaked: bigint) => SelectData
}

export const useTotalStakedQuery = <SelectData = TotalStaked>({
  select,
}: UseTotalStakedQueryProps<SelectData>) => {
  return useReadContract({
    abi: foxStakingV1Abi,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'totalStaked',
    chainId: arbitrum.id,
    query: {
      select,
    },
  })
}
