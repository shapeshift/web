import { Box } from '@chakra-ui/react'
import { FeatureFlag } from 'constants/FeatureFlag'
import {
  useNormalizeOpportunities
} from 'features/defi/helpers/normalizeOpportunity'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { useSortedYearnVaults } from 'hooks/useSortedYearnVaults/useSortedYearnVaults'

import { StakingTable } from './StakingTable'

export const AllEarnOpportunities = () => {
  const earnFeature = FeatureFlag.Yearn
  const sortedVaults = useSortedYearnVaults()

  const allRows = useNormalizeOpportunities({
    vaultArray: sortedVaults,
    foxyArray: []
  }).filter(vault => !vault.expired)

  if (!earnFeature) return null

  return (
    <Card variant='outline' my={6}>
      <Card.Header flexDir='row' display='flex'>
        <Box>
          <Card.Heading>
            <Text translation='defi.earn' />
          </Card.Heading>
          <Text color='gray.500' translation='defi.earnBody' />
        </Box>
      </Card.Header>
      <Card.Body pt={0} px={2}>
        <StakingTable data={allRows} onClick={() => console.info('clicked')} />
      </Card.Body>
    </Card>
  )
}
