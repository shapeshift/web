import { Stack } from '@chakra-ui/react'
import { useMemo } from 'react'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { Text } from '@/components/Text'
import { ChainflipLendingHeader } from '@/pages/ChainflipLending/components/ChainflipLendingHeader'

export const Overview = () => {
  const headerComponent = useMemo(() => <ChainflipLendingHeader />, [])

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title='Chainflip Lending' />
      <Stack spacing={4}>
        <Text color='text.subtle' translation='chainflipLending.overviewPlaceholder' />
      </Stack>
    </Main>
  )
}
