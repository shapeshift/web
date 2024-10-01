import { ChevronUpIcon } from '@chakra-ui/icons'
import type { BoxProps } from '@chakra-ui/react'
import { Box, Circle, IconButton } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

export type TwirlyToggleProps = { isOpen: boolean; onToggle: () => void } & BoxProps

export const TwirlyToggle = ({ isOpen, onToggle, ...boxProps }: TwirlyToggleProps) => {
  const translate = useTranslate()

  const icon = useMemo(
    () => (
      <Circle size={8} bgColor='background.surface.raised.base' borderWidth={0}>
        <ChevronUpIcon
          transform={isOpen ? 'rotate(0deg)' : 'rotate(180deg)'}
          transition='transform 0.2s ease-in-out'
          boxSize='16px'
        />
      </Circle>
    ),
    [isOpen],
  )

  return (
    <Box width='auto' {...boxProps}>
      <IconButton
        aria-label={translate('trade.expand')}
        variant='link'
        borderTopRadius='none'
        colorScheme='blue'
        onClick={onToggle}
        width='full'
        icon={icon}
      />
    </Box>
  )
}
