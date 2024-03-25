import { Box, Flex, Skeleton, SkeletonCircle, VStack } from '@chakra-ui/react'

export const GroupedAssetRowLoading = () => {
  return (
    <Flex ml={4} height={16} gap={4} alignItems='center'>
      <SkeletonCircle height='32px' />
      <Box textAlign='left'>
        <Skeleton lineHeight={1} maxWidth='200px' />
        <VStack alignItems='flex-start'>
          <Skeleton height='16px' width='200px' />
          <Skeleton height='16px' width='50px' />
        </VStack>
      </Box>
    </Flex>
  )
}
