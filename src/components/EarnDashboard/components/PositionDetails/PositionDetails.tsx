import { Flex } from '@chakra-ui/react'

import { StakingPositionsByProvider } from './StakingPositionsByProvider'

import type { AggregatedOpportunitiesByAssetIdReturn } from '@/state/slices/opportunitiesSlice/types'

const flexPx = { base: 4, md: 6 }
const flexPy = { base: 2, md: 8 }
const flexGap = { base: 2, md: 6 }

export const PositionDetails: React.FC<AggregatedOpportunitiesByAssetIdReturn> = ({
  opportunities,
}) => {
  return (
    <Flex px={flexPx} py={flexPy} flexDir='column' gap={flexGap}>
      <StakingPositionsByProvider ids={opportunities.staking} />
    </Flex>
  )
}
