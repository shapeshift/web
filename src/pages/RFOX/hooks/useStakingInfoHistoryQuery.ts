import { foxStakingV1Abi } from 'contracts/abis/FoxStakingV1'
import { RFOX_PROXY_CONTRACT_ADDRESS } from 'contracts/constants'
import { getAddress } from 'viem'
import { arbitrum } from 'viem/chains'
import { useReadContracts } from 'wagmi'

import type { AbiStakingInfo } from '../types'
import { useEpochHistoryQuery } from './useEpochHistoryQuery'

type UseStakingInfoHistoryQueryProps<SelectData = AbiStakingInfo> = {
  stakingAssetAccountAddress: string | undefined
  select?: (runeAddresses: AbiStakingInfo) => SelectData
}

/**
 * Fetches the historical StakingInfo at the end of each epoch in the past. Doesn't include the current epoch.
 */
export const useStakingInfoHistoryQuery = <SelectData = AbiStakingInfo[]>({
  stakingAssetAccountAddress,
  select,
}: UseStakingInfoHistoryQueryProps<SelectData>) => {
  const epochHistory = useEpochHistoryQuery()

  const combinedQueries = useReadContracts({
    contracts:
      stakingAssetAccountAddress && epochHistory.data
        ? epochHistory.data.map(epoch => ({
            abi: foxStakingV1Abi,
            address: RFOX_PROXY_CONTRACT_ADDRESS,
            args: [getAddress(stakingAssetAccountAddress)],
            functionName: 'stakingInfo',
            chainId: arbitrum.id,
            blockNumber: epoch.endBlockNumber,
            query: {
              staleTime: 60 * 60 * 1000, // 1 hour in milliseconds
              select,
            },
          }))
        : [],
  })

  return combinedQueries
}
