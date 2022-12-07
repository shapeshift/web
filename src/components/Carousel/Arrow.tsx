import { IconButton } from '@chakra-ui/react'

import type { ArrowProps } from './types'

export const Arrow = ({ direction = 'left', children, onClick }: ArrowProps) => {
  return (
    <IconButton variant='ghost' size='sm' aria-label={direction} onClick={onClick}>
      {children}
    </IconButton>
  )
}
