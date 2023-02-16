import { Flex } from '@chakra-ui/react'
import type { RowProps } from 'components/StakingVaults/PositionTable'

import { LpPositions } from './StakingPositions/LpPositions'
import { ProviderPositions } from './StakingPositions/ProviderPositions'

export const PositionDetails: React.FC<RowProps> = ({ original }) => {
  const { assetId } = original
  if (!assetId) return null
  return (
    <Flex px={6} py={8} flexDir='column' gap={6}>
      <ProviderPositions ids={original.opportunities.staking} assetId={original.assetId} />

      <LpPositions ids={original.opportunities.lp} assetId={original.assetId} />
    </Flex>
  )
}
