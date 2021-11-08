import { Stack } from '@chakra-ui/react'

import { CardActions } from './AssetCards/CardActions'

export const AssetRightSidebar = () => {
  return (
    <Stack flex={1} spacing={4}>
      <CardActions />
    </Stack>
  )
}
