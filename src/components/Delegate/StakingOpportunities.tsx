import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, HStack, Stack } from '@chakra-ui/react'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

import { StakingOpportunitiesRow } from './StakingOpportunitiesRow'

export const StakingOpportunities = () => {
  // TODO: wire up with real validator data
  const validators = [{ id: 1, name: 'Cosmos Validator' }]

  return (
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
            <StakingOpportunitiesRow name={validator.name} key={validator.id} />
          ))}
        </Stack>
      </Card.Body>
    </Card>
  )
}
