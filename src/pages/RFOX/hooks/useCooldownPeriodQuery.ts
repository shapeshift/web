import { RFOX_ABI, RFOX_PROXY_CONTRACT } from '@shapeshiftoss/contracts'
import { arbitrum } from 'viem/chains'
import { useReadContract } from 'wagmi'
import { formatSecondsToDuration } from 'lib/utils/time'

export const useCooldownPeriodQuery = () => {
  const cooldownPeriodQuery = useReadContract({
    abi: RFOX_ABI,
    address: RFOX_PROXY_CONTRACT,
    functionName: 'cooldownPeriod',
    chainId: arbitrum.id,
    query: {
      staleTime: Infinity,
      select: data => formatSecondsToDuration(Number(data)),
    },
  })

  return cooldownPeriodQuery
}
