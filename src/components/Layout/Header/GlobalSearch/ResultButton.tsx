import type { ButtonProps } from '@chakra-ui/react'
import { Button, forwardRef, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'

export const ResultButton = forwardRef<ButtonProps, 'div'>((props, ref) => {
  const backgroundColor = useColorModeValue('blackAlpha.200', 'whiteAlpha.100')
  const selectedStyle = useMemo(() => ({ bg: backgroundColor }), [backgroundColor])
  return (
    <Button
      display='grid'
      gridTemplateColumns='50% 1fr'
      alignItems='center'
      variant='ghost'
      py={2}
      height='auto'
      width='full'
      ref={ref}
      _selected={selectedStyle}
      {...props}
    />
  )
})
