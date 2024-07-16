import type { BoxProps } from '@chakra-ui/react'
import { ETH_FOX_STAKING_CONTRACT_ADDRESS_V9 } from 'contracts/constants'
import { uniqBy } from 'lodash'
import { useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
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
    const filteredEligibleOpportunities = eligibleOpportunities
      .filter(o => bnOrZero(o.tvl).gt(50000) && bnOrZero(o.apy).gte(0.01))
      .sort((a, b) => bn(b.apy ?? '0').toNumber() - bn(a.apy ?? '0').toNumber())
      .slice(0, 5)

    const foxFarmingV9 = eligibleOpportunities.find(
      eligibleOpportunity =>
        eligibleOpportunity.contractAddress === ETH_FOX_STAKING_CONTRACT_ADDRESS_V9,
    )

    const rfoxOpportunity = eligibleOpportunities.find(
      eligibleOpportunity => eligibleOpportunity.provider === DefiProvider.rFOX,
    )

    if (!foxFarmingV9) {
      return filteredEligibleOpportunities.map(opportunity => (
        <FeaturedCard key={`${opportunity.id}`} {...opportunity} />
      ))
    }

    // TEMP: Hardcode the Fox Farming V9 opportunity to be the first card until enough TVL is in the pool
    const filteredEligibleOpportunitiesWithFoxFarmingV9 = uniqBy(
      [filteredEligibleOpportunities[0], foxFarmingV9, ...filteredEligibleOpportunities.slice(1)],
      'contractAddress',
    ).slice(0, rfoxOpportunity ? 4 : 5)

    if (rfoxOpportunity) {
      return [rfoxOpportunity, ...filteredEligibleOpportunitiesWithFoxFarmingV9].map(
        opportunity => <FeaturedCard key={`${opportunity.id}`} {...opportunity} />,
      )
    }

    return filteredEligibleOpportunitiesWithFoxFarmingV9.map(opportunity => (
      <FeaturedCard key={`${opportunity.id}`} {...opportunity} />
    ))
  }, [eligibleOpportunities])

  if (eligibleOpportunities.length === 0) return null
  return (
    <FeaturedList slidesToShow={slidesToShow} {...rest}>
      {renderEligibleCards}
    </FeaturedList>
  )
}
