import { Stack } from '@chakra-ui/react'
import { useMemo } from 'react'

import { Main } from '@/components/Layout/Main'
import { Text } from '@/components/Text'
import { ChainflipLendingHeader } from '@/pages/ChainflipLending/components/ChainflipLendingHeader'

export const BorrowTab = () => {
  const headerComponent = useMemo(() => <ChainflipLendingHeader />, [])

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <Stack spacing={4}>
        <Text color='text.subtle' translation='chainflipLending.borrowPlaceholder' />
      </Stack>
    </Main>
  )
}
