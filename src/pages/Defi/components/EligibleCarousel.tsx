import type { CardProps } from '@chakra-ui/react'
import { Button, Card, Flex, Heading } from '@chakra-ui/react'
import { ETH_FOX_STAKING_CONTRACT_ADDRESS_V9 } from 'contracts/constants'
import { uniqBy } from 'lodash'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { NavLink } from 'react-router-dom'
import { Carousel } from 'components/Carousel/Carousel'
import type { CarouselHeaderProps } from 'components/Carousel/types'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAggregatedEarnUserStakingEligibleOpportunities } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FeaturedCard } from './FeaturedCards/FeaturedCard'

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
  const eligibleOpportunities = useAppSelector(selectAggregatedEarnUserStakingEligibleOpportunities)
  const filteredEligibleOpportunities = useMemo(() => {
    // opportunities with 1% APY or more
    const filteredEligibleOpportunities = eligibleOpportunities
      .filter(o => bnOrZero(o.tvl).gt(50000) && bnOrZero(o.apy).gte(0.01))
      .sort((a, b) => bn(b.apy).minus(a.apy).toNumber())
      .slice(0, 5)

    const foxFarmingV9 = eligibleOpportunities.find(
      eligibleOpportunity =>
        eligibleOpportunity.contractAddress === ETH_FOX_STAKING_CONTRACT_ADDRESS_V9,
    )

    if (!foxFarmingV9) {
      return filteredEligibleOpportunities
    }

    // TEMP: Hardcode the Fox Farming V9 opportunity to be the first card until enough TVL is in the pool
    const filteredEligibleOpportunitiesWithFoxFarmingV9 = uniqBy(
      [filteredEligibleOpportunities[0], foxFarmingV9, ...filteredEligibleOpportunities.slice(1)],
      'contractAddress',
    ).slice(0, 5)

    return filteredEligibleOpportunitiesWithFoxFarmingV9
  }, [eligibleOpportunities])
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
