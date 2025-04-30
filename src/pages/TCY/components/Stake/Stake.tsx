import { Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import type { TCYRouteProps } from '../../types'

export const Stake: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  const translate = useTranslate()
  return (
    <Stack>
      {headerComponent}
      <p>{translate('TCY.stake')}</p>
    </Stack>
  )
}
