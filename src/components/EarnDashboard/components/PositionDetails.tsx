import { Flex } from '@chakra-ui/react'
import type { RowProps } from 'components/StakingVaults/PositionTable'

import { LpPositions } from './StakingPositions/LpPositions'
import { ProviderPositions } from './StakingPositions/ProviderPositions'

export const PositionDetails: React.FC<RowProps> = ({ original }) => {
  const { assetId } = original
  if (!assetId) return null
  return (
    <Flex px={{ base: 4, md: 6 }} py={{ base: 2, md: 8 }} flexDir='column' gap={{ base: 2, md: 6 }}>
      <ProviderPositions ids={original.opportunities.staking} assetId={original.assetId} />

      <LpPositions ids={original.opportunities.lp} assetId={original.assetId} />
    </Flex>
  )
}
