import type { CardProps } from '@chakra-ui/react'
import { Button, Card, Flex, Heading } from '@chakra-ui/react'
import { useMemo } from 'react'
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

export const EligibleCarousel: React.FC<EligibleCarouselProps> = props => {
  const eligibleOpportunities = useAppSelector(selectAggregatedEarnUserStakingEligibleOpportunities)
  const filteredEligibleOpportunities = useMemo(() => {
    // opportunities with 1% APY or more
    return eligibleOpportunities
      .filter(o => bnOrZero(o.tvl).gt(50000) && bnOrZero(o.apy).gte(0.01))
      .sort((a, b) => bn(b.apy).minus(a.apy).toNumber())
      .slice(0, 5)
  }, [eligibleOpportunities])
  const renderEligibleCards = useMemo(() => {
    return filteredEligibleOpportunities.map(opportunity => (
      <FeaturedCard key={opportunity.assetId} {...opportunity} />
    ))
  }, [filteredEligibleOpportunities])

  if (!filteredEligibleOpportunities.length) return null

  return (
    <Card variant='unstyled' px={cardPadding}>
      <Carousel autoPlay slideSize='100%' renderHeader={props => <Header {...props} />} {...props}>
        {renderEligibleCards}
      </Carousel>
    </Card>
  )
}
