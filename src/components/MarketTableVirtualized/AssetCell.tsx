import { Box } from '@chakra-ui/react'
import { truncate } from 'lodash'
import { memo } from 'react'

import { AssetCell as StakingVaultsAssetCell } from '@/components/StakingVaults/Cells'

const assetCellSx = {
  maxWidth: '350px',
}

type AssetCellProps = {
  assetId: string
  symbol: string
  isGrouped?: boolean
}

export const AssetCell = memo<AssetCellProps>(({ assetId, symbol, isGrouped }) => (
  <Box sx={assetCellSx}>
    <StakingVaultsAssetCell
      assetId={assetId}
      subText={truncate(symbol, { length: 6 })}
      isGrouped={isGrouped}
    />
  </Box>
))
