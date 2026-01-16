import { Flex, useMediaQuery } from '@chakra-ui/react'

import { StakingPositionsByProvider } from './StakingPositionsByProvider'

import type { YieldOpportunityDisplay } from '@/components/StakingVaults/hooks/useYieldAsOpportunities'
import type { AggregatedOpportunitiesByAssetIdReturn } from '@/state/slices/opportunitiesSlice/types'
import { breakpoints } from '@/theme/theme'

type PositionDetailsProps = AggregatedOpportunitiesByAssetIdReturn & {
  forceCompactView?: boolean
  yieldOpportunities?: YieldOpportunityDisplay[]
}

export const PositionDetails: React.FC<PositionDetailsProps> = ({
  opportunities,
  forceCompactView,
  yieldOpportunities,
}) => {
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const isCompactView = !isLargerThanMd || forceCompactView

  const flexPx = isCompactView ? 4 : 6
  const flexPy = isCompactView ? 2 : 8
  const flexGap = isCompactView ? 2 : 6

  const hasPositions = opportunities.staking.length > 0 || (yieldOpportunities?.length ?? 0) > 0

  if (!hasPositions) return null

  return (
    <Flex px={flexPx} py={flexPy} flexDir='column' gap={flexGap}>
      <StakingPositionsByProvider
        ids={opportunities.staking}
        forceCompactView={forceCompactView}
        yieldOpportunities={yieldOpportunities}
      />
    </Flex>
  )
}
