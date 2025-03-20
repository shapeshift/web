import { ArrowForwardIcon } from '@chakra-ui/icons'
import { 
  Button, 
  Flex, 
  Heading, 
  Skeleton,
  SkeletonText,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Stack
} from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as NavLink } from 'react-router-dom'

import { RawText } from '@/components/Text'

const alignItems = { base: 'flex-start', md: 'center' }
const padding = { base: 4, xl: 0 }
const arrowForwardIcon = <ArrowForwardIcon />

const EarnHeaderSkeleton = () => {
  const translate = useTranslate()

  return (
    <Flex alignItems={alignItems} px={padding} flexWrap='wrap'>
      <Flex width='full' justifyContent='space-between' alignItems='center'>
        <Skeleton>
          <Heading fontSize='xl'>{translate('defi.myPositions')}</Heading>
        </Skeleton>
        <Skeleton>
          <Button
            colorScheme='purple'
            variant='ghost'
            as={NavLink}
            to='/earn'
            size='sm'
            ml='auto'
            rightIcon={arrowForwardIcon}
          >
            {translate('defi.viewAllPositions')}
          </Button>
        </Skeleton>
      </Flex>
      <Skeleton width='100%'>
        <RawText color='text.subtle'>{translate('defi.myPositionsBody')}</RawText>
      </Skeleton>
    </Flex>
  )
}

export const DeFiEarnSkeleton = memo(() => {
  const translate = useTranslate()

  return (
    <Flex width='full' flexDir='column' gap={6}>
      <EarnHeaderSkeleton />
      <Flex justifyContent='space-between' alignItems='center' gap={4} flexWrap='wrap' px={padding}>
        <Box flex={1} />
        <Skeleton height='40px' width='200px' borderRadius='lg' />
        <Skeleton height='40px' width='280px' borderRadius='lg' />
      </Flex>
      <Box overflow='hidden' borderRadius='xl'>
        <Table>
          <Thead>
            <Tr>
              <Th width='40px'>#</Th>
              <Th>Asset</Th>
              <Th>Value</Th>
              <Th>APY</Th>
              <Th width='40px'></Th>
            </Tr>
          </Thead>
          <Tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <Tr key={index}>
                <Td>
                  <Skeleton height='20px' width='20px' />
                </Td>
                <Td>
                  <Stack direction='row' alignItems='center' spacing={4}>
                    <Skeleton height='32px' width='32px' borderRadius='full' />
                    <SkeletonText noOfLines={2} width='120px' />
                  </Stack>
                </Td>
                <Td>
                  <SkeletonText noOfLines={2} width='100px' />
                </Td>
                <Td>
                  <Skeleton height='24px' width='60px' borderRadius='md' />
                </Td>
                <Td>
                  <Skeleton height='32px' width='32px' borderRadius='full' />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Flex>
  )
}) 