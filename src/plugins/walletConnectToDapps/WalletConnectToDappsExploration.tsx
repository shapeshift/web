import { Heading } from '@chakra-ui/react'
import { Text } from 'components/Text'
import { FC } from 'react'

import { DappRegistryGrid } from './DappRegistryGrid'
import { ExplorationBanner } from './ExplorationBanner'

export const WalletConnectToDappsExploration: FC = () => {
  return (
    <>
      <ExplorationBanner />
      <Heading>
        <Text translation='plugins.walletConnectToDapps.availableDapps' />
      </Heading>
      <DappRegistryGrid />
    </>
  )
}
