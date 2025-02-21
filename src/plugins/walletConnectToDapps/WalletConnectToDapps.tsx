import { Stack } from '@chakra-ui/react'
import type { FC } from 'react'

import { DappRegistryGrid } from './components/DappRegistryGrid'
import { ExplorationBanner } from './components/ExplorationBanner'

import { Main } from '@/components/Layout/Main'

export const WalletConnectToDapps: FC = () => {
  return (
    <Main>
      <Stack spacing={10}>
        <ExplorationBanner />
        <DappRegistryGrid />
      </Stack>
    </Main>
  )
}
