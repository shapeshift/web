import { Button } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Carousel } from 'components/Carousel/Carousel'
import { bn } from 'lib/bignumber/bignumber'
import { selectAggregatedEarnUserStakingEligibleOpportunities } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FeaturedCard } from './FeaturedCards/FeaturedCard'

export const EligibleCarousel = () => {
  const translate = useTranslate()
  const eligibleOpportunities = useAppSelector(selectAggregatedEarnUserStakingEligibleOpportunities)
  const filteredEligibleOpportunities = useMemo(() => {
    return eligibleOpportunities
      .filter(o => bnOrZero(o.tvl).gt(50000))
      .sort((a, b) => bn(b.apy).minus(a.apy).toNumber()
  }, [eligibleOpportunities])
  const renderEligibleCards = useMemo(() => {
    return filteredEligibleOpportunities.map(opportunity => (
      <FeaturedCard key={opportunity.assetId} {...opportunity} />
    ))
  }, [filteredEligibleOpportunities])

  if (!filteredEligibleOpportunities.length) return null

  return (
    <Card variant='outline' flexDir='column' gap={2}>
      <Card.Header
        display='flex'
        borderBottom={0}
        alignItems='center'
        justifyContent='space-between'
      >
        <Card.Heading>{translate('defi.eligibleOpportunities')}</Card.Heading>
        <Button as={NavLink} to='/defi/earn' variant='link' colorScheme='blue'>
          {translate('common.viewAll')}
        </Button>
      </Card.Header>
      <Card.Body>
        <Carousel showDots showArrows>
          {renderEligibleCards}
        </Carousel>
      </Card.Body>
    </Card>
  )
}
