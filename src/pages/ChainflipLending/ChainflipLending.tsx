import { Stack } from '@chakra-ui/react'

import { Main } from '@/components/Layout/Main'
import { Text } from '@/components/Text'

export const ChainflipLending = () => {
  return (
    <Main>
      <Stack px={6} py={8} spacing={4}>
        <Text as='h1' translation='navBar.chainflipLending' />
      </Stack>
    </Main>
  )
}
