import { Box, Flex, SimpleGrid, Skeleton } from '@chakra-ui/react'
import { memo } from 'react'

import { SEO } from '@/components/Layout/Seo'

const gridTemplateColumns = {
  base: 'repeat(auto-fit, minmax(150px, 1fr))',
  sm: 'repeat(2, 1fr)',
  md: 'repeat(3, 1fr)',
  lg: 'repeat(4, 1fr)',
}

const gridPaddingX = { base: 4, xl: 0 }
const boxPaddingX = { base: 4, xl: 0 }

const NftGridSkeleton = (props: { itemCount?: number }) => {
  const { itemCount = 8 } = props

  return (
    <SimpleGrid gridGap={4} gridTemplateColumns={gridTemplateColumns} px={gridPaddingX}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <Box key={index} borderRadius='xl' overflow='hidden' boxShadow='sm'>
          <Skeleton height='200px' width='100%' />
          <Box p={3}>
            <Skeleton height='20px' width='80%' mb={2} />
            <Skeleton height='16px' width='60%' />
          </Box>
        </Box>
      ))}
    </SimpleGrid>
  )
}

export const NftTableSkeleton = memo(() => {
  return (
    <>
      <SEO title='NFTs' />
      <Box mb={4} px={boxPaddingX}>
        <Flex gap={2}>
          <Skeleton height='40px' width='140px' borderRadius='lg' />
          <Skeleton height='40px' width='240px' borderRadius='lg' />
        </Flex>
      </Box>
      <NftGridSkeleton itemCount={8} />
    </>
  )
})
