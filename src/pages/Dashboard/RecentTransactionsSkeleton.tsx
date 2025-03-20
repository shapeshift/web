import type { CardProps } from '@chakra-ui/react'
import { Box, Button, Card, CardHeader, Flex, Heading, Skeleton, Stack } from '@chakra-ui/react'
import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { NavLink } from 'react-router-dom'

import { Text } from '@/components/Text'

type RecentTransactionsSkeletonProps = {
  limit?: number
  viewMoreLink?: boolean
} & CardProps

export const RecentTransactionsSkeleton: React.FC<RecentTransactionsSkeletonProps> = memo(
  ({ limit = 5, viewMoreLink, ...rest }) => {
    const translate = useTranslate()

    return (
      <Card variant='dashboard' {...rest}>
        <CardHeader display='flex' justifyContent='space-between' alignItems='center' mb={4}>
          <Heading as='h5'>
            <Text translation={'dashboard.recentTransactions.recentTransactions'} />
          </Heading>
          {viewMoreLink && (
            <Button as={NavLink} to='/wallet/activity' variant='link' size='sm' colorScheme='blue'>
              {translate('common.viewAll')}
            </Button>
          )}
        </CardHeader>

        <Stack spacing={4} px={4} pb={4}>
          {Array.from({ length: limit }).map((_, i) => (
            <Flex
              key={i}
              alignItems='center'
              justifyContent='space-between'
              p={2}
              borderRadius='md'
            >
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
      </Card>
    )
  },
)

