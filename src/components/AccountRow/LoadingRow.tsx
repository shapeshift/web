import { Flex, SimpleGrid, SkeletonText } from '@chakra-ui/react'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'

export const LoadingRow = () => (
  <SimpleGrid
    templateColumns={{ base: '1fr repeat(2, 1fr)', lg: '2fr repeat(3, 1fr) 150px' }}
    py={4}
    pl={4}
    pr={4}
    rounded='lg'
    gridGap='1rem'
    alignItems='center'
  >
    <Flex alignItems='center'>
      <AssetIcon boxSize='30px' mr={2} />
      <Flex flexDir='column' ml={2}>
        <SkeletonText noOfLines={2} width='100px' />
      </Flex>
    </Flex>
    <Flex justifyContent='flex-end' textAlign='right'>
      <SkeletonText noOfLines={1} width='100%' height='16px' />
    </Flex>
    <Flex display={{ base: 'none', lg: 'flex' }} justifyContent='flex-end'>
      <SkeletonText noOfLines={1} width='100%' />
    </Flex>
    <Flex justifyContent='flex-end' flexWrap='nowrap' whiteSpace='nowrap'>
      <SkeletonText noOfLines={1} width='100%' />
    </Flex>
    <Flex display={{ base: 'none', lg: 'flex' }} alignItems='center' justifyContent='flex-end'>
      <SkeletonText noOfLines={1} width='100%' />
    </Flex>
  </SimpleGrid>
)
