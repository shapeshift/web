import { Button } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { NavLink } from 'react-router-dom'
import type { CardProps } from 'components/Card/Card'
import { Card } from 'components/Card/Card'
import { Carousel } from 'components/Carousel/Carousel'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAggregatedEarnUserStakingEligibleOpportunities } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FeaturedCard } from './FeaturedCards/FeaturedCard'

type EligibleCarouselProps = CardProps

export const EligibleCarousel: React.FC<EligibleCarouselProps> = props => {
  const translate = useTranslate()
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
    <Card variant='outline' flexDir='column' {...props}>
      <Card.Header
        display='flex'
        borderBottom={0}
        alignItems='center'
        justifyContent='space-between'
      >
        <Card.Heading>{translate('defi.eligibleOpportunities')}</Card.Heading>
        <Button as={NavLink} to='/earn' variant='link' colorScheme='blue'>
          {translate('common.viewAll')}
        </Button>
      </Card.Header>
      <Card.Body>
        <Carousel showDots showArrows autoPlay>
          {renderEligibleCards}
        </Carousel>
      </Card.Body>
    </Card>
  )
}
