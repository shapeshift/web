import { Flex } from '@chakra-ui/react'
import type { AggregatedOpportunitiesByProviderReturn } from 'state/slices/opportunitiesSlice/types'

import { LpPositions } from './StakingPositions/LpPositions'
import { ProviderPositions } from './StakingPositions/ProviderPositions'

export const ProviderDetails: React.FC<AggregatedOpportunitiesByProviderReturn> = ({
  provider,
  opportunities,
}) => {
  if (!provider) return null
  return (
    <Flex px={{ base: 4, md: 6 }} py={{ base: 2, md: 8 }} flexDir='column' gap={{ base: 2, md: 6 }}>
      Staking
      {opportunities.staking.map(id => (
        <p>{id}</p>
      ))}
      LP
      {opportunities.lp.map(id => (
        <p>{id}</p>
      ))}
    </Flex>
  )
}
