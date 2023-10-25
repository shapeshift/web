import { Flex, SimpleGrid, Skeleton, SkeletonCircle, SkeletonText } from '@chakra-ui/react'

const templateColumns = {
  base: '1fr repeat(1, 1fr)',
  md: '1fr repeat(2, 1fr)',
  lg: '2fr repeat(3, 1fr) 150px',
}
const displayLgFlex = { base: 'none', lg: 'flex' }
const displayMdFlex = { base: 'none', md: 'flex' }

export const LoadingRow = () => (
  <SimpleGrid
    templateColumns={templateColumns}
    py={4}
    pl={4}
    pr={4}
    rounded='lg'
    gridGap='1rem'
    alignItems='center'
  >
    <Flex alignItems='center'>
      <SkeletonCircle boxSize='30px' mr={2} />
      <Flex flexDir='column' ml={2}>
        <SkeletonText noOfLines={2} width='100px' />
      </Flex>
    </Flex>
    <Flex justifyContent='flex-end' textAlign='right'>
      <Skeleton height='16px' width='100%' />
    </Flex>
    <Flex display={displayLgFlex} justifyContent='flex-end'>
      <Skeleton height='16px' width='100%' />
    </Flex>
    <Flex display={displayMdFlex} justifyContent='flex-end' flexWrap='nowrap' whiteSpace='nowrap'>
      <Skeleton height='16px' width='100%' />
    </Flex>
    <Flex display={displayLgFlex} alignItems='center' justifyContent='flex-end'>
      <Skeleton height='16px' width='100%' />
    </Flex>
  </SimpleGrid>
)
