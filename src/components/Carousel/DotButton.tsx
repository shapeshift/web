import { IconButton } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import type { DotButtonProps } from './types'

const activeStyle = {
  bg: 'blue.500',
}

export const DotButton: React.FC<DotButtonProps> = ({ selected, onClick }) => {
  const translate = useTranslate()

  return (
    <IconButton
      className={`embla__dot ${selected ? 'is-selected' : ''}`}
      type='button'
      variant='solid'
      aria-label={translate('common.carousel.dot')}
      width='10px'
      height='10px'
      minWidth='auto'
      _active={activeStyle}
      bg={selected ? 'blue.500' : 'background.surface.raised.base'}
      isActive={selected}
      onClick={onClick}
      isRound
    />
  )
}
