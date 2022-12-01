import { Flex } from '@chakra-ui/react'
import { useMemo } from 'react'
import { selectAggregatedEarnUserStakingEligibleOpportunities } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FeaturedCard } from './FeaturedCards/FeaturedCard'

type EligibleGridProps = {
  limit?: number
}

export const EligibleGrid: React.FC<EligibleGridProps> = ({ limit = 3 }) => {
  const stakingOpportunities = useAppSelector(selectAggregatedEarnUserStakingEligibleOpportunities)
  const renderEligibleCards = useMemo(() => {
    return stakingOpportunities
      .slice(0, limit)
      .map(opportunity => <FeaturedCard key={opportunity.assetId} {...opportunity} />)
  }, [limit, stakingOpportunities])
  return (
    <Flex flexDir='column' gap={4}>
      {renderEligibleCards}
    </Flex>
  )
}
