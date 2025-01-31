import type { BoxProps } from '@chakra-ui/react'
import { ETH_FOX_STAKING_V9_CONTRACT } from '@shapeshiftoss/contracts'
import { uniqBy } from 'lodash'
import { useMemo } from 'react'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { useIsLendingActive } from 'pages/Lending/hooks/useIsLendingActive'
import { DefiProvider } from 'state/slices/opportunitiesSlice/types'
import { selectAggregatedEarnUserStakingEligibleOpportunities } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FeaturedCard } from './FeaturedCards/FeaturedCard'
import { FeaturedList } from './FeaturedCards/FeaturedList/FeaturedList'

type EligibleSliderProps = {
  slidesToShow?: number
} & BoxProps

export const EligibleSlider: React.FC<EligibleSliderProps> = ({ slidesToShow = 4, ...rest }) => {
  const { isLendingActive } = useIsLendingActive()
  const eligibleOpportunities = useAppSelector(selectAggregatedEarnUserStakingEligibleOpportunities)

  const featuredOpportunities = useMemo(() => {
    // opportunities with 1% APY or more
    const filteredEligibleOpportunities = eligibleOpportunities
      .filter(
        o =>
          bnOrZero(o.tvl).gt(50000) &&
          (!o.apy || bn(o.apy).gte(0.01)) &&
          (o.provider !== DefiProvider.ThorchainSavers || isLendingActive),
      )
      .sort((a, b) => bnOrZero(b.apy).toNumber() - bnOrZero(a.apy).toNumber())
      .slice(0, 5)

    const foxFarmingV9 = eligibleOpportunities.find(
      eligibleOpportunity => eligibleOpportunity.contractAddress === ETH_FOX_STAKING_V9_CONTRACT,
    )

    const rfoxOpportunity = eligibleOpportunities.find(
      eligibleOpportunity => eligibleOpportunity.provider === DefiProvider.rFOX,
    )

    if (!foxFarmingV9 && !rfoxOpportunity) {
      return filteredEligibleOpportunities
    }

    const filteredEligibleOpportunitiesWithFoxFarmingV9 = uniqBy(
      [
        rfoxOpportunity,
        filteredEligibleOpportunities[0],
        foxFarmingV9,
        ...filteredEligibleOpportunities.slice(1),
      ].filter(isSome),
      'contractAddress',
    ).slice(0, 5)

    return filteredEligibleOpportunitiesWithFoxFarmingV9
  }, [eligibleOpportunities, isLendingActive])

  const renderEligibleCards = useMemo(() => {
    return featuredOpportunities.map(opportunity => (
      <FeaturedCard key={`${opportunity.id}`} {...opportunity} />
    ))
  }, [featuredOpportunities])

  if (featuredOpportunities.length === 0) return null
  return (
    <FeaturedList slidesToShow={slidesToShow} {...rest}>
      {renderEligibleCards}
    </FeaturedList>
  )
}
