import { Flex } from '@chakra-ui/react'
import type { AggregatedOpportunitiesByProviderReturn } from 'state/slices/opportunitiesSlice/types'

import { LpPositionsByPosition } from './LpPositionsByPosition'
import { StakingPositionsByPosition } from './StakingOpportunitiesByPosition'

export const ProviderDetails: React.FC<AggregatedOpportunitiesByProviderReturn> = ({
  provider,
  opportunities,
}) => {
  if (!provider) return null
  return (
    <Flex px={{ base: 4, md: 6 }} py={{ base: 2, md: 8 }} flexDir='column' gap={{ base: 2, md: 6 }}>
      <StakingPositionsByPosition ids={opportunities.staking} />
      <LpPositionsByPosition ids={opportunities.lp} />
    </Flex>
  )
}
