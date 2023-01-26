import { Flex, StatGroup } from '@chakra-ui/react'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import type { RowProps } from 'components/StakingVaults/PositionTable'

import { AvailableBalance } from './StakingPositions/AvailableBalance'
import { LpPositions } from './StakingPositions/LpPositions'
import { ProviderPositions } from './StakingPositions/ProviderPositions'
import { StakedBalance } from './StakingPositions/StakedBalance'

export const PositionDetails = ({ original }: RowProps) => {
  const assetId = original.underlyingAssetIds[0]
  if (!assetId) return null
  return (
    <Flex bg='blackAlpha.400' px={6} py={8} flexDir='column' gap={6}>
      <AssetHeader assetId={original.assetId} />
      <StatGroup flex={1}>
        <StakedBalance cryptoAmountBaseUnit={original.cryptoBalance} assetId={assetId} />
        <AvailableBalance assetId={assetId} />
      </StatGroup>
      <ProviderPositions ids={original.opportunities.staking} />

      <LpPositions ids={original.opportunities.lp} />
    </Flex>
  )
}
