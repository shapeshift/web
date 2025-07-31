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
}

export const AssetCell = memo<AssetCellProps>(({ assetId, symbol }) => (
  <Box sx={assetCellSx}>
    <StakingVaultsAssetCell assetId={assetId} subText={truncate(symbol, { length: 6 })} />
  </Box>
))
