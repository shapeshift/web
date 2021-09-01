import { Divider, Stack } from '@chakra-ui/react'

import { AssetBalance } from './AssetCards/AssetBalance'
import { CardActions } from './AssetCards/CardActions'
import { Pools } from './AssetCards/Pools'
import { Rewards } from './AssetCards/Rewards'

export const AssetRightSidebar = () => {
  return (
    <Stack flex={1} spacing={4}>
      <CardActions />
      <AssetBalance />
      <Divider />
      <Rewards />
      <Divider />
      <Pools />
    </Stack>
  )
}
