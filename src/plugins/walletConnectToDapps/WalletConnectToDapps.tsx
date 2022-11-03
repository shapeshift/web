import { Alert, AlertIcon, Container, Stack } from '@chakra-ui/react'
import type { FC } from 'react'

import { DappRegistryGrid } from './components/DappRegistryGrid'
import { ExplorationBanner } from './components/ExplorationBanner'

export const WalletConnectToDapps: FC = () => {
  return (
    <Container p={4} maxW='container.lg'>
      <Stack spacing={10}>
        <Alert status='info'>
          <AlertIcon />
          Hello World
        </Alert>
        <ExplorationBanner />
        <DappRegistryGrid />
      </Stack>
    </Container>
  )
}
