import { Flex } from '@chakra-ui/react'
import type { AggregatedOpportunitiesByProviderReturn } from 'state/slices/opportunitiesSlice/types'

import { LpPositionsByAsset } from './LpPositionsByAsset'
import { StakingPositionsByAsset } from './StakingOpportunitiesByAsset'

export const ProviderDetails: React.FC<AggregatedOpportunitiesByProviderReturn> = ({
  provider,
  opportunities,
}) => {
  if (!provider) return null
  return (
    <Flex px={{ base: 4, md: 6 }} py={{ base: 2, md: 8 }} flexDir='column' gap={{ base: 2, md: 6 }}>
      <StakingPositionsByAsset ids={opportunities.staking} />
      <LpPositionsByAsset ids={opportunities.lp} />
    </Flex>
  )
}
