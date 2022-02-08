import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, HStack, Stack } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useRenderForChains } from 'hooks/useRenderForChains/useRenderForChains'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'

import { StakingOpportunitiesRow } from './StakingOpportunitiesRow'

type StakingOpportunitiesProps = {
  tokenId?: string
  assetId: CAIP19
  accountId?: AccountSpecifier
  isLoaded?: boolean
}

export const StakingOpportunities = ({ assetId: caip19 }: StakingOpportunitiesProps) => {
  // TODO: wire up with real validator data
  const validators = [{ name: 'Cosmos Validator' }]

  const cosmosStaking = () => (
    <Card>
      <Card.Header flexDir='row' display='flex'>
        <HStack justify='space-between' flex={1}>
          <Card.Heading>
            <Text translation='staking.staking' />
          </Card.Heading>

          <Button size='sm' variant='link' colorScheme='blue' as={NavLink} to='/defi/earn'>
            <Text translation='common.seeAll' /> <ArrowForwardIcon />
          </Button>
        </HStack>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack spacing={2} mt={2} mx={-4}>
          {validators.map(validator => (
            <StakingOpportunitiesRow name={validator.name} />
          ))}
        </Stack>
      </Card.Body>
    </Card>
  )

  // TODO: add ChainTypes.Cosmos to the array to render only on cosmos based chains
  return useRenderForChains([], cosmosStaking)
}
