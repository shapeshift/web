import { IconButton } from '@chakra-ui/react'

import type { ArrowProps } from './types'

export const Arrow = ({ children, onClick, ...rest }: ArrowProps) => {
  return (
    <IconButton variant='ghost' size='sm' onClick={onClick} {...rest}>
      {children}
    </IconButton>
  )
}
