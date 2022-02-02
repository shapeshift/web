import { ArrowForwardIcon } from '@chakra-ui/icons'
import { CAIP19 } from '@shapeshiftoss/caip'
import { Box, Button, HStack, Stack } from '@chakra-ui/react'
import { RawText, Text } from 'components/Text'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { useAppSelector } from 'state/store'

import { StakingOpportunitiesRow } from './StakingOpportunitiesRow'

type StakingOpportunitiesProps = {
  tokenId?: string
  assetId: CAIP19
  accountId?: AccountSpecifier
  isLoaded?: boolean
}

export const StakingOpportunities = ({ assetId: caip19 }: StakingOpportunitiesProps) => {
  const asset = useAppSelector(state => selectAssetByCAIP19(state, caip19))
  const validators = [
    { name: 'Cosmos Validator' }
  ]

  return (
    <Card>
      <Card.Header flexDir='row' display='flex'>
        <HStack justify='space-between'>
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
          {'Hey'}
          {/* {validators.map(validator => ( */}
          {/*   <StakingOpportunitiesRow /> */}
          {/* ))} */}
        </Stack>
      </Card.Body>
    </Card>
  )
}
