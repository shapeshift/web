import { RFOX_ABI, RFOX_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
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
    abi: RFOX_ABI,
    address: RFOX_PROXY_CONTRACT,
    functionName: 'totalStaked',
    chainId: arbitrum.id,
    query: {
      select,
    },
  })
}
