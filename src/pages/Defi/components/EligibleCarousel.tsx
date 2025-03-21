import type { CardProps } from '@chakra-ui/react'
import { Button, Card, Flex, Heading } from '@chakra-ui/react'
import { ETH_FOX_STAKING_EVERGREEN_CONTRACT } from '@shapeshiftoss/contracts'
import { uniqBy } from 'lodash'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { NavLink } from 'react-router-dom'

import { FeaturedCard } from './FeaturedCards/FeaturedCard'

import { Carousel } from '@/components/Carousel/Carousel'
import type { CarouselHeaderProps } from '@/components/Carousel/types'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { isSome } from '@/lib/utils'
import { useIsLendingActive } from '@/pages/Lending/hooks/useIsLendingActive'
import { DefiProvider } from '@/state/slices/opportunitiesSlice/types'
import { selectAggregatedEarnUserStakingEligibleOpportunities } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type EligibleCarouselProps = CardProps

const Header: React.FC<CarouselHeaderProps> = ({ controls }) => {
  const translate = useTranslate()
  return (
    <Flex alignItems='center' justifyContent='space-between' width='full'>
      <Flex alignItems='center' gap={4}>
        <Heading as='h4' fontSize='md'>
          {translate('defi.eligibleOpportunities')}
        </Heading>
        <Button as={NavLink} to='/earn' variant='link' colorScheme='blue'>
          {translate('common.viewAll')}
        </Button>
      </Flex>
      {controls}
    </Flex>
  )
}

const cardPadding = { base: 4, xl: 0 }
const displayXlFlex = { base: 'none', xl: 'flex' }

export const EligibleCarousel: React.FC<EligibleCarouselProps> = props => {
  const { isLendingActive } = useIsLendingActive()
  const eligibleOpportunities = useAppSelector(selectAggregatedEarnUserStakingEligibleOpportunities)
  const filteredEligibleOpportunities = useMemo(() => {
    // opportunities with 1% APY or more
    const filteredEligibleOpportunities = eligibleOpportunities
      .filter(
        o =>
          bnOrZero(o.tvl).gt(50000) &&
          bnOrZero(o.apy).gte(0.01) &&
          (o.provider !== DefiProvider.ThorchainSavers || isLendingActive),
      )
      .sort((a, b) =>
        bn(b.apy ?? '0')
          .minus(a.apy ?? '0')
          .toNumber(),
      )
      .slice(0, 5)

    const foxFarmingEvergreen = eligibleOpportunities.find(
      eligibleOpportunity =>
        eligibleOpportunity.contractAddress === ETH_FOX_STAKING_EVERGREEN_CONTRACT,
    )

    const rfoxOpportunity = eligibleOpportunities.find(
      eligibleOpportunity => eligibleOpportunity.provider === DefiProvider.rFOX,
    )

    if (!foxFarmingEvergreen && !rfoxOpportunity) {
      return filteredEligibleOpportunities
    }

    const filteredEligibleOpportunitiesWithFoxFarmingEvergreen = uniqBy(
      [
        rfoxOpportunity,
        filteredEligibleOpportunities[0],
        foxFarmingEvergreen,
        ...filteredEligibleOpportunities.slice(1),
      ].filter(isSome),
      'contractAddress',
    ).slice(0, 5)

    return filteredEligibleOpportunitiesWithFoxFarmingEvergreen
  }, [eligibleOpportunities, isLendingActive])

  const renderEligibleCards = useMemo(() => {
    return filteredEligibleOpportunities.map(opportunity => (
      <FeaturedCard key={opportunity.assetId} {...opportunity} />
    ))
  }, [filteredEligibleOpportunities])

  const renderHeader = useCallback((props: CarouselHeaderProps) => <Header {...props} />, [])

  if (!filteredEligibleOpportunities.length) return null

  return (
    <Card variant='unstyled' px={cardPadding} display={displayXlFlex}>
      <Carousel autoPlay slideSize='100%' renderHeader={renderHeader} {...props}>
        {renderEligibleCards}
      </Carousel>
    </Card>
  )
}
