import type { BoxProps } from '@chakra-ui/react'
import { useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAggregatedEarnUserStakingEligibleOpportunities } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FeaturedCard } from './FeaturedCards/FeaturedCard'
import { FeaturedList } from './FeaturedCards/FeaturedList/FeaturedList'

type EligibleSliderProps = {
  slidesToShow?: number
} & BoxProps

export const EligibleSlider: React.FC<EligibleSliderProps> = ({ slidesToShow = 4, ...rest }) => {
  const eligibleOpportunities = useAppSelector(selectAggregatedEarnUserStakingEligibleOpportunities)
  const renderEligibleCards = useMemo(() => {
    // opportunities with 1% APY or more
    return eligibleOpportunities
      .filter(o => bnOrZero(o.tvl).gt(50000) && bnOrZero(o.apy).gte(0.01))
      .sort((a, b) => bn(b.apy).toNumber() - bn(a.apy).toNumber())
      .map(opportunity => <FeaturedCard key={`${opportunity.id}`} {...opportunity} />)
  }, [eligibleOpportunities])

  if (eligibleOpportunities.length === 0) return null
  return (
    <FeaturedList slidesToShow={slidesToShow} {...rest}>
      {renderEligibleCards}
    </FeaturedList>
  )
}
