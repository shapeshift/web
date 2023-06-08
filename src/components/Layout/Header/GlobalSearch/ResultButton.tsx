import type { ButtonProps } from '@chakra-ui/react'
import { Button, forwardRef, useColorModeValue } from '@chakra-ui/react'

export const ResultButton = forwardRef<ButtonProps, 'div'>((props, ref) => (
  <Button
    display='grid'
    gridTemplateColumns='50% 1fr'
    alignItems='center'
    variant='ghost'
    py={2}
    height='auto'
    width='full'
    ref={ref}
    _selected={{ bg: useColorModeValue('blackAlpha.200', 'whiteAlpha.100') }}
    {...props}
  />
))
