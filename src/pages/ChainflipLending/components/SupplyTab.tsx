import { Stack } from '@chakra-ui/react'
import { useMemo } from 'react'

import { Main } from '@/components/Layout/Main'
import { Text } from '@/components/Text'
import { ChainflipLendingHeader } from '@/pages/ChainflipLending/components/ChainflipLendingHeader'

export const SupplyTab = () => {
  const headerComponent = useMemo(() => <ChainflipLendingHeader />, [])

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <Stack spacing={4}>
        <Text color='text.subtle' translation='chainflipLending.supplyPlaceholder' />
      </Stack>
    </Main>
  )
}
