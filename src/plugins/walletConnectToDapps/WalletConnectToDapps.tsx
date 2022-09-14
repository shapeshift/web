import { Container, Stack } from '@chakra-ui/react'
import type { FC } from 'react'

import { DappRegistryGrid } from './components/DappRegistryGrid'
import { ExplorationBanner } from './components/ExplorationBanner'

export const WalletConnectToDapps: FC = () => {
  return (
    <Container p={4} maxW='container.lg'>
      <Stack spacing={10}>
        <ExplorationBanner />
        <DappRegistryGrid />
      </Stack>
    </Container>
  )
}
