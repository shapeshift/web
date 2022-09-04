import { FC } from 'react'

import { DappRegistryGrid } from './DappRegistryGrid'
import { ExplorationBanner } from './ExplorationBanner'

export const WalletConnectToDappsExploration: FC = () => {
  return (
    <>
      <ExplorationBanner />
      <DappRegistryGrid />
    </>
  )
}
