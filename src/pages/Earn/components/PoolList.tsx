import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Flex, Heading, SimpleGrid } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { FaWater } from 'react-icons/fa'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'

import { PoolCard } from './PoolCard'

const pools = [
  {
    token0: 'ETH',
    token1: 'FOX',
    tokenAmount: '3.7124',
    fiatAmount: '24.18'
  },
  {
    token0: 'UNI',
    token1: 'ETH',
    tokenAmount: '3.7124',
    fiatAmount: '1400.38'
  },
  {
    token0: 'WBTC',
    token1: 'ETH',
    tokenAmount: '25.7124',
    fiatAmount: '4448.48'
  },
  {
    token0: 'SUSHI',
    token1: 'ETH',
    tokenAmount: '3.7124',
    fiatAmount: '1400.38'
  }
]

/*

Display the user's current LP positions 

*/

export const PoolList = () => {
  return (
    <Box mb={6}>
      <Flex alignItems='center' mb={6} justifyContent='space-between'>
        <Flex alignItems='center' color='gray.500'>
          <IconCircle>
            <FaWater />
          </IconCircle>
          <Heading fontSize='lg' ml={3}>
            <Text translation='earn.liquidityPools' />
          </Heading>
        </Flex>
        <Button
          variant='ghost'
          colorScheme='blue'
          rightIcon={<ArrowForwardIcon />}
          as={NavLink}
          to='/earn/liquidity-pools'
        >
          <Text translation='common.seeAll' />
        </Button>
      </Flex>
      <SimpleGrid
        gridTemplateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
        gridGap={6}
      >
        {pools.map((pool, index) => (
          <PoolCard isLoaded={true} key={index} {...pool} />
        ))}
      </SimpleGrid>
      {pools.length === 0 && (
        <Card textAlign='center' py={6} boxShadow='none'>
          <Card.Body>
            <Flex justifyContent='center' fontSize='xxx-large' mb={4} color='gray.500'>
              <IconCircle fontSize='2xl' boxSize='16'>
                <FaWater />
              </IconCircle>
            </Flex>
            <Text
              fontWeight='medium'
              fontSize='lg'
              mb={2}
              color='gray.500'
              translation='earn.empty.pools.body'
            />
            <Button variant='ghost' colorScheme='blue'>
              <Text translation='earn.empty.pools.cta' />
            </Button>
          </Card.Body>
        </Card>
      )}
    </Box>
  )
}
