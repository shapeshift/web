import { Stack } from '@chakra-ui/react'

import type { TCYRouteProps } from '../../types'

export const Stake: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  return (
    <Stack>
      {headerComponent}
      <p>Stake</p>
    </Stack>
  )
}
