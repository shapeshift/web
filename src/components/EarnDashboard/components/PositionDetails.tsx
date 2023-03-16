import { Flex } from '@chakra-ui/react'
import type { AggregatedOpportunitiesByAssetIdReturn } from 'state/slices/opportunitiesSlice/types'

import { LpPositions } from './StakingPositions/LpPositions'
import { ProviderPositions } from './StakingPositions/ProviderPositions'

export const PositionDetails: React.FC<AggregatedOpportunitiesByAssetIdReturn> = ({
  assetId,
  opportunities,
}) => {
  if (!assetId) return null
  return (
    <Flex px={{ base: 4, md: 6 }} py={{ base: 2, md: 8 }} flexDir='column' gap={{ base: 2, md: 6 }}>
      <ProviderPositions ids={opportunities.staking} assetId={assetId} />
      <LpPositions ids={opportunities.lp} assetId={assetId} />
    </Flex>
  )
}
