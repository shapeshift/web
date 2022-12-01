import type { BoxProps } from '@chakra-ui/react'
import { useMemo } from 'react'
import { selectAggregatedEarnUserStakingEligibleOpportunities } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FeaturedCard } from './FeaturedCards/FeaturedCard'
import { FeaturedList } from './FeaturedCards/FeaturedList/FeaturedList'

type EligibleSliderProps = {
  slidesToShow?: number
} & BoxProps

export const EligibleSlider: React.FC<EligibleSliderProps> = ({ slidesToShow = 4, ...rest }) => {
  const stakingOpportunities = useAppSelector(selectAggregatedEarnUserStakingEligibleOpportunities)
  const renderEligibleCards = useMemo(() => {
    return stakingOpportunities
      .sort((a, b) => Number(b.apy) - Number(a.apy))
      .map(opportunity => <FeaturedCard key={opportunity.assetId} {...opportunity} />)
  }, [stakingOpportunities])

  if (stakingOpportunities.length === 0) return null
  return (
    <FeaturedList slidesToShow={slidesToShow} {...rest}>
      {renderEligibleCards}
    </FeaturedList>
  )
}
