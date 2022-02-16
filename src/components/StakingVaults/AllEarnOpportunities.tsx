import { Box, Flex, Table, Tbody } from '@chakra-ui/react'
import { FeatureFlag } from 'constants/FeatureFlag'
import { useMemo } from 'react'
import { Card } from 'components/Card/Card'
import { IconCircle } from 'components/IconCircle'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { useSortedYearnVaults } from 'hooks/useSortedYearnVaults/useSortedYearnVaults'

import { EarnOpportunityRow } from './EarnOpportunityRow'
import { EarnTableHeader } from './EarnTableHeader'

export const AllEarnOpportunities = () => {
  const earnFeature = FeatureFlag.Yearn
  const sortedVaults = useSortedYearnVaults()

  const vaultRows = useMemo(
    () =>
      sortedVaults
        .filter(vault => !vault.expired)
        .map((vault, index) => {
          return (
            <EarnOpportunityRow
              {...vault}
              key={vault.vaultAddress}
              index={index + 1}
              isLoaded={!!vault}
            />
          )
        }),
    [sortedVaults]
  )

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
        {vaultRows.length > 0 ? (
          <Box>
            <Table variant='clickable'>
              <EarnTableHeader />
              <Tbody>{vaultRows}</Tbody>
            </Table>
          </Box>
        ) : (
          <Card textAlign='center' py={6} boxShadow='none' border={0}>
            <Card.Body>
              <Flex justifyContent='center' fontSize='xxx-large' mb={4} color='gray.500'>
                <IconCircle fontSize='2xl' boxSize='16'>
                  <FoxIcon />
                </IconCircle>
              </Flex>
              <Text
                fontWeight='medium'
                fontSize='lg'
                mb={2}
                color='gray.500'
                translation='defi.emptyEarn'
              />
            </Card.Body>
          </Card>
        )}
      </Card.Body>
    </Card>
  )
}
