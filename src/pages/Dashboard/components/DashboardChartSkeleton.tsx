import type { ResponsiveValue } from '@chakra-ui/react'
import { Box, Card, CardHeader, Flex, Heading, Skeleton } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { memo } from 'react'

const displayMdFlex: ResponsiveValue<Property.Display> = { base: 'none', md: 'flex' }
const displayMdBlock: ResponsiveValue<Property.Display> = { base: 'none', md: 'block' }
const justifyContentMdSpaceBetween: ResponsiveValue<Property.JustifyContent> = {
  base: 'center',
  md: 'space-between',
}
const flexDirMdRow: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const textAlignMdInherit: ResponsiveValue<Property.TextAlign> = { base: 'center', md: 'inherit' }
const displayMdNone: ResponsiveValue<Property.Display> = { base: 'block', md: 'none' }

export const DashboardChartSkeleton = memo(() => {
  return (
    <Card variant='dashboard'>
      <CardHeader
        display={displayMdFlex}
        justifyContent={justifyContentMdSpaceBetween}
        alignItems='center'
        textAlign={textAlignMdInherit}
        width='full'
        flexDir={flexDirMdRow}
        borderBottomWidth={0}
      >
        <Skeleton width='150px' height='32px' />
        <Skeleton display={displayMdBlock} width='200px' height='32px' />
      </CardHeader>

      <Flex flexDir='column' justifyContent='center' alignItems='center' display={displayMdFlex}>
        <Heading as='div' color='text.subtle'>
          <Skeleton width='150px' height='24px' />
        </Heading>
        <Flex>
          <Heading as='h2' fontSize='4xl' lineHeight='1' mr={2}>
            <Skeleton width='200px' height='40px' mt={2} />
          </Heading>
        </Flex>
        <Skeleton width='80px' height='24px' mt={2} />
      </Flex>

      {/* Chart area skeleton */}
      <Box px={4} py={6}>
        <Skeleton height='200px' width='100%' />
      </Box>

      <Skeleton display={displayMdNone} height='32px' mx={6} my={4} />
    </Card>
  )
})
