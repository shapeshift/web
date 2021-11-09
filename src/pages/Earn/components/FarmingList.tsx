import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Flex, Heading, SimpleGrid } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { FaTractor } from 'react-icons/fa'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'

import { FarmingCard } from './FarmingCard'

const farming = [
  {
    token0: 'ETH',
    token1: 'FOX',
    tokenAmount: '3.7124',
    fiatAmount: '1588.88'
  },
  {
    token0: 'UNI',
    token1: 'ETH',
    tokenAmount: '3.7124',
    fiatAmount: '348.28'
  }
]
/*

List of the user's current farming opportunities

*/
export const FarmingList = () => {
  return (
    <Box mb={6}>
      <Flex alignItems='center' mb={6} justifyContent='space-between'>
        <Flex alignItems='center' color='gray.500'>
          <IconCircle>
            <FaTractor />
          </IconCircle>
          <Heading fontSize='lg' ml={3}>
            <Text translation='earn.farming' />
          </Heading>
        </Flex>
        <Button
          variant='ghost'
          colorScheme='blue'
          rightIcon={<ArrowForwardIcon />}
          as={NavLink}
          to='/earn/farming'
        >
          <Text translation='common.seeAll' />
        </Button>
      </Flex>
      <SimpleGrid
        gridTemplateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
        gridGap={6}
      >
        {farming.map((pool, index) => (
          <FarmingCard isLoaded={true} key={index} {...pool} />
        ))}
      </SimpleGrid>
      {farming.length === 0 && (
        <Card textAlign='center' py={6} boxShadow='none'>
          <Card.Body>
            <Flex justifyContent='center' fontSize='xxx-large' mb={4} color='gray.500'>
              <IconCircle fontSize='2xl' boxSize='16'>
                <FaTractor />
              </IconCircle>
            </Flex>
            <Text
              fontWeight='medium'
              fontSize='lg'
              mb={2}
              color='gray.500'
              translation='earn.empty.farming.body'
            />
            <Button variant='ghost' colorScheme='blue'>
              <Text translation='earn.empty.farming.cta' />
            </Button>
          </Card.Body>
        </Card>
      )}
    </Box>
  )
}
