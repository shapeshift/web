import { IconButton, useColorModeValue } from '@chakra-ui/react'

import type { DotButtonProps } from './types'

export const DotButton: React.FC<DotButtonProps> = ({ selected, onClick }) => (
  <IconButton
    className={`embla__dot ${selected ? 'is-selected' : ''}`}
    type='button'
    variant='solid'
    aria-label='dot'
    width='10px'
    height='10px'
    minWidth='auto'
    _active={{ bg: useColorModeValue('black', 'white') }}
    isActive={selected}
    onClick={onClick}
    isRound
  />
)
