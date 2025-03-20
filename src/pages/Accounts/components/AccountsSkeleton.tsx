import { Heading, List, Skeleton, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'

import { Text } from '@/components/Text'

const pxProps = { base: 4, xl: 0 }

export const AccountsSkeleton = () => {
  const blanks = Array(4).fill(0)
  
  const blankRows = useMemo(() => {
    return blanks.map((_, index) => (
      <Skeleton key={`chain-${index}`} height='82px' width='full' borderRadius='2xl' />
    ))
  }, [blanks])

  return (
    <>
      <Stack px={pxProps} direction='row' justifyContent='space-between' alignItems='center' pb={6}>
        <Heading fontSize='xl'>
          <Text translation='accounts.accounts' />
        </Heading>
      </Stack>
      <List ml={0} mt={0} spacing={4}>
        {blankRows}
      </List>
    </>
  )
} 