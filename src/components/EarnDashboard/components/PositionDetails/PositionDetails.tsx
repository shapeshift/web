import { Flex } from '@chakra-ui/react'
import type { AggregatedOpportunitiesByAssetIdReturn } from 'state/slices/opportunitiesSlice/types'

import { LpPositionsByProvider } from './LpPositionsByProvider'
import { StakingPositionsByProvider } from './StakingPositionsByProvider'

const flexPx = { base: 4, md: 6 }
const flexPy = { base: 2, md: 8 }
const flexGap = { base: 2, md: 6 }

export const PositionDetails: React.FC<AggregatedOpportunitiesByAssetIdReturn> = ({
  assetId,
  opportunities,
}) => {
  if (!assetId) return null
  return (
    <Flex px={flexPx} py={flexPy} flexDir='column' gap={flexGap}>
      <StakingPositionsByProvider ids={opportunities.staking} assetId={assetId} />
      <LpPositionsByProvider ids={opportunities.lp} assetId={assetId} />
    </Flex>
  )
}
