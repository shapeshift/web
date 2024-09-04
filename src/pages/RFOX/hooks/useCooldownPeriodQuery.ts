import { FOX_STAKING_V1_ABI, RFOX_PROXY_CONTRACT_ADDRESS } from '@shapeshiftoss/contracts'
import { arbitrum } from 'viem/chains'
import { useReadContract } from 'wagmi'
import { formatSecondsToDuration } from 'lib/utils/time'

export const useCooldownPeriodQuery = () => {
  const cooldownPeriodQuery = useReadContract({
    abi: FOX_STAKING_V1_ABI,
    address: RFOX_PROXY_CONTRACT_ADDRESS,
    functionName: 'cooldownPeriod',
    chainId: arbitrum.id,
    query: {
      staleTime: Infinity,
      select: data => formatSecondsToDuration(Number(data)),
    },
  })

  return cooldownPeriodQuery
}
