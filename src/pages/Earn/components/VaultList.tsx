import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Flex, Heading, SimpleGrid } from '@chakra-ui/layout'
import { Button } from '@chakra-ui/react'
import { SUPPORTED_VAULTS } from 'features/earn/providers/yearn/constants/vaults'
import { FaLock } from 'react-icons/fa'
import { NavLink } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { IconCircle } from 'components/IconCircle'
import { Text } from 'components/Text'

import { StakingCard } from './StakingCard'

// find active positions with suppported vaults

export const VaultList = () => {
  return (
    <Box mb={6}>
      <Flex alignItems='center' mb={6} justifyContent='space-between'>
        <Flex alignItems='center' color='gray.500'>
          <IconCircle>
            <FaLock />
          </IconCircle>
          <Heading fontSize='lg' ml={3}>
            <Text translation='earn.stakingVaults' />
          </Heading>
        </Flex>
        <Button
          variant='ghost'
          colorScheme='blue'
          rightIcon={<ArrowForwardIcon />}
          as={NavLink}
          to='/earn/staking-vaults'
        >
          <Text translation='common.seeAll' />
        </Button>
      </Flex>
      <SimpleGrid
        gridTemplateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
        gridGap={6}
      >
        {SUPPORTED_VAULTS.map((vault, index) => (
          <StakingCard isLoaded={true} key={index} {...vault} />
        ))}
      </SimpleGrid>
      {SUPPORTED_VAULTS.length === 0 && (
        <Card textAlign='center' py={6} boxShadow='none'>
          <Card.Body>
            <Flex justifyContent='center' fontSize='xxx-large' mb={4} color='gray.500'>
              <IconCircle fontSize='2xl' boxSize='16'>
                <FaLock />
              </IconCircle>
            </Flex>
            <Text
              fontWeight='medium'
              fontSize='lg'
              mb={2}
              color='gray.500'
              translation='earn.empty.stakingVaults.body'
            />
            <Button variant='ghost' colorScheme='blue'>
              <Text translation='earn.empty.stakingVaults.cta' />
            </Button>
          </Card.Body>
        </Card>
      )}
    </Box>
  )
}
