import { Stack } from '@chakra-ui/react'
import type { FC } from 'react'
import { Main } from 'components/Layout/Main'

import { DappRegistryGrid } from './components/DappRegistryGrid'
import { ExplorationBanner } from './components/ExplorationBanner'

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
