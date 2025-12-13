import { Box, Flex, SkeletonCircle, SkeletonText, Stack } from '@chakra-ui/react'
import { memo } from 'react'

export const AccountTableSkeleton = memo(() => {
  return (
    <Stack spacing={4}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Flex
          key={i}
          p={4}
          borderRadius='md'
          borderWidth='1px'
          borderColor='border.base'
          alignItems='center'
          justifyContent='space-between'
        >
          <Flex alignItems='center'>
            <SkeletonCircle size='10' mr={4} />
            <Box>
              <SkeletonText width='120px' noOfLines={1} mb={1} />
              <SkeletonText width='80px' noOfLines={1} />
            </Box>
          </Flex>
          <Box>
            <SkeletonText width='80px' noOfLines={1} mb={1} />
            <SkeletonText width='60px' noOfLines={1} />
          </Box>
        </Flex>
      ))}
    </Stack>
  )
})
