import { IconButton } from '@chakra-ui/react'

import type { ArrowProps } from './types'

export const Arrow = ({ left = false, children, onClick }: ArrowProps) => {
  return (
    <IconButton variant='ghost' size='sm' aria-label={left ? 'left' : 'right'} onClick={onClick}>
      {children}
    </IconButton>
  )
}
