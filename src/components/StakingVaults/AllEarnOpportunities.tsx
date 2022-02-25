import { Box, Flex, Table, Tbody } from '@chakra-ui/react'
import { ChainTypes } from '@shapeshiftoss/types'
import { FeatureFlag } from 'constants/FeatureFlag'
import { DefiType } from 'features/defi/contexts/DefiManagerProvider/DefiManagerProvider'
import { NoramlizeEarnOpportunities } from 'features/defi/helpers/normalizeOpportunity'
import { FoxyOpportunityRow } from 'features/defi/providers/foxy/components/FoxyOpporunityRow'
import { YearnVaultRow } from 'features/defi/providers/yearn/components/YearnVaultRow'
import { useMemo } from 'react'
import { Card } from 'components/Card/Card'
import { IconCircle } from 'components/IconCircle'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { useSortedYearnVaults } from 'hooks/useSortedYearnVaults/useSortedYearnVaults'

import { EarnTableHeader } from './EarnTableHeader'

const testFoxy = [
  {
    tokenAddress: '0x49849c98ae39fff122806c06791fa73784fb3675',
    contractAddress: '0x49849c98ae39fff122806c06791fa73784fb3675',
    chain: ChainTypes.Ethereum,
    type: 'token-staking'
  }
]

{
  /* <YearnVaultRow
{...opportunity}
index={index + 1}
key={opportunity.contractAddress}
isLoaded={!!opportunity}
showTeaser
/> */
}

export const AllEarnOpportunities = () => {
  const earnFeature = FeatureFlag.Yearn
  const sortedVaults = useSortedYearnVaults()
  const allRows = NoramlizeEarnOpportunities({ vaultArray: sortedVaults, foxyArray: testFoxy })
  const vaultRows = useMemo(() => {
    return allRows
      .filter(opportunity => !opportunity.expired)
      .map((opportunity, index) => {
        switch (opportunity.type) {
          case DefiType.TokenStaking:
            return (
              <FoxyOpportunityRow
                {...opportunity}
                index={index + 1}
                key={opportunity.contractAddress}
                isLoaded={!!opportunity}
                showTeaser
              />
            )
          default:
            return (
              <YearnVaultRow
                {...opportunity}
                index={index + 1}
                key={opportunity.contractAddress}
                isLoaded={!!opportunity}
                showTeaser
              />
            )
        }
      })
  }, [allRows])

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
