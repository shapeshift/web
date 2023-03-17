import { Flex } from '@chakra-ui/react'
import type { AggregatedOpportunitiesByAssetIdReturn } from 'state/slices/opportunitiesSlice/types'

import { LpPositionsByProvider } from './LpPositionsByProvider'
import { StakingPositionsByProvider } from './StakingPositionsByProvider'

export const PositionDetails: React.FC<AggregatedOpportunitiesByAssetIdReturn> = ({
  assetId,
  opportunities,
}) => {
  if (!assetId) return null
  return (
    <Flex px={{ base: 4, md: 6 }} py={{ base: 2, md: 8 }} flexDir='column' gap={{ base: 2, md: 6 }}>
      <StakingPositionsByProvider ids={opportunities.staking} assetId={assetId} />
      <LpPositionsByProvider ids={opportunities.lp} assetId={assetId} />
    </Flex>
  )
}
