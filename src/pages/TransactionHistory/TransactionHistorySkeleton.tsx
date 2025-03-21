import { Box, Flex, Skeleton, Stack } from '@chakra-ui/react'
import { memo } from 'react'

const headingPadding = [2, 3, 6]
const stackMargin = { base: 0, xl: -4, '2xl': -6 }

export const TransactionHistorySkeleton = memo(() => {
  return (
    <Stack mx={stackMargin}>
      {/* Header with search, filter, and download buttons */}
      <Flex width='full' justifyContent='space-between' p={headingPadding}>
        <Flex gap={2}>
          {/* Search input */}
          <Skeleton height='40px' width='240px' borderRadius='lg' />
          {/* Filter button */}
          <Skeleton height='40px' width='100px' borderRadius='lg' />
        </Flex>
        {/* Download button */}
        <Skeleton height='40px' width='120px' borderRadius='lg' />
      </Flex>

      {/* Transaction list */}
      <Stack spacing={4} px={4} pb={4}>
        {Array.from({ length: 10 }).map((_, i) => (
          <Flex key={i} alignItems='center' justifyContent='space-between' p={2} borderRadius='md'>
            <Flex alignItems='center'>
              <Skeleton width='40px' height='40px' borderRadius='full' mr={3} />
              <Box>
                <Skeleton width='120px' height='14px' mb={1} />
                <Skeleton width='80px' height='12px' />
              </Box>
            </Flex>
            <Box textAlign='right'>
              <Skeleton width='70px' height='14px' mb={1} />
              <Skeleton width='40px' height='12px' />
            </Box>
          </Flex>
        ))}
      </Stack>
    </Stack>
  )
})
