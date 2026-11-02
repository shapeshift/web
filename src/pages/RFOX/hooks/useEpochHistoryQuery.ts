import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getAddress } from 'viem'

import type { Epoch } from '../types'
import { useCurrentEpochMetadataQuery } from './useCurrentEpochMetadataQuery'

import { getConfig } from '@/config'

export type EpochWithIpfsHash = Epoch & { ipfsHash: string }

type EpochHistoryQueryArgs = {
  stakingAddress: string | undefined
  epoch: number | undefined
}

type UseEpochHistoryQueryProps<SelectData = EpochWithIpfsHash[]> = {
  stakingAddress: string | undefined
  select?: (data: EpochWithIpfsHash[]) => SelectData
}

export const getEpochHistoryQueryKey = (args?: EpochHistoryQueryArgs) =>
  args ? (['epochHistory', args.stakingAddress, args.epoch] as const) : (['epochHistory'] as const)

const fetchEpochHistory = async (stakingAddress: string): Promise<EpochWithIpfsHash[]> => {
  const { data } = await axios.get<EpochWithIpfsHash[]>(
    `${getConfig().VITE_PROXY_API_BASE_URL}/api/v1/rfox/epochs/${stakingAddress}`,
    { timeout: 15_000 },
  )

  return data
}

// Keyed by epoch so history always moves together with the metadata rewards are calculated from
export const getEpochHistoryQueryOptions = ({ stakingAddress, epoch }: EpochHistoryQueryArgs) => {
  const checksumAddress = stakingAddress ? getAddress(stakingAddress) : undefined

  return {
    queryKey: getEpochHistoryQueryKey({ stakingAddress: checksumAddress, epoch }),
    queryFn: () => fetchEpochHistory(checksumAddress as string),
    enabled: Boolean(checksumAddress && epoch !== undefined),
  }
}

export const useEpochHistoryQuery = <SelectData = EpochWithIpfsHash[]>({
  stakingAddress,
  select,
}: UseEpochHistoryQueryProps<SelectData>) => {
  const metadataQuery = useCurrentEpochMetadataQuery()

  const query = useQuery({
    ...getEpochHistoryQueryOptions({ stakingAddress, epoch: metadataQuery.data?.epoch }),
    select,
  })

  return {
    ...query,
    isLoading: metadataQuery.isLoading || query.isLoading,
    isError: metadataQuery.isError || query.isError,
  }
}
