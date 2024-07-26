import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
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
