import { Box, Skeleton, SkeletonText, useColorModeValue } from '@chakra-ui/react'

export const NftCardLoading = () => {
  const bg = useColorModeValue('gray.50', 'gray.750')
  return (
    <Box bg={bg} borderRadius='xl' overflow='hidden'>
      <Skeleton paddingBottom='100%' borderStartRadius='none' />
      <Box p={4}>
        <SkeletonText noOfLines={2} />
      </Box>
    </Box>
  )
}
