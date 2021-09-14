import { Box, Flex, HStack } from '@chakra-ui/layout'
import { Skeleton, SkeletonCircle } from '@chakra-ui/skeleton'
import { Stat, StatGroup } from '@chakra-ui/stat'
import { Card } from 'components/Card/Card'

import { AssetActions } from './AssetActions'

export const SkeletonLoader = () => {
  return (
    <Card variant='footer-stub'>
      <Card.Header display='flex' alignItems='center' flexDir={{ base: 'column', lg: 'row' }}>
        <Flex alignItems='center' mr='auto'>
          <SkeletonCircle boxSize='60px' />
          <Box ml={3} textAlign='left'>
            <Skeleton height='24px' width='full' />
            <Skeleton height='16px' width='full' />
          </Box>
        </Flex>
      </Card.Header>
      <Card.Body>
        <Box>
          <Flex justifyContent='space-between' width='full' flexDir={{ base: 'column', md: 'row' }}>
            <HStack>
              <Skeleton height='sm' />
              <Skeleton height='sm' />
            </HStack>
          </Flex>
          <Box width='full' alignItems='center' display='flex' flexDir='column' mt={6}>
            <Skeleton height='4xl' />
            <StatGroup>
              <Stat size='sm' display='flex' flex='initial' mr={2}>
                <Skeleton height='sm' />
              </Stat>
              <Stat size='sm' color='gray.500'>
                <Skeleton height='sm' />
              </Stat>
            </StatGroup>
          </Box>
        </Box>
      </Card.Body>
      <Card.Body px={0} py={0} position='relative' height='300px'>
        <Skeleton height='300px' />
      </Card.Body>
      <Card.Footer>
        <StatGroup>
          <Stat textAlign='center'>
            <Skeleton height='sm' />
            <Skeleton height='ld' />
          </Stat>
          <Stat textAlign='center'>
            <Skeleton height='sm' />
            <Skeleton height='ld' />
          </Stat>
          <Stat textAlign='center'>
            <Skeleton height='sm' />
            <Skeleton height='ld' />
          </Stat>
          <Stat textAlign='center'>
            <Skeleton height='sm' />
            <Skeleton height='ld' />
          </Stat>
        </StatGroup>
      </Card.Footer>
      <Card.Footer>
        <Skeleton height='lg' />
        <Skeleton height='md' />
      </Card.Footer>
    </Card>
  )
}
