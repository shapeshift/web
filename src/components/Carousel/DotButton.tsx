import { IconButton, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'

import type { DotButtonProps } from './types'

export const DotButton: React.FC<DotButtonProps> = ({ selected, onClick }) => {
  const backgroundColor = useColorModeValue('black', 'white')
  const activeStyle = useMemo(() => ({ bg: backgroundColor }), [backgroundColor])
  return (
    <IconButton
      className={`embla__dot ${selected ? 'is-selected' : ''}`}
      type='button'
      variant='solid'
      aria-label='dot'
      width='10px'
      height='10px'
      minWidth='auto'
      _active={activeStyle}
      isActive={selected}
      onClick={onClick}
      isRound
    />
  )
}
