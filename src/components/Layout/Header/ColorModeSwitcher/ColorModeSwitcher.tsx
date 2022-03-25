import { IconButton, IconButtonProps, useColorMode, useColorModeValue } from '@chakra-ui/react'
import * as React from 'react'
import { FaMoon } from 'react-icons/fa'

type ColorModeSwitcherProps = Omit<IconButtonProps, 'aria-label'>

export const ColorModeSwitcher: React.FC<ColorModeSwitcherProps> = props => {
  const { toggleColorMode } = useColorMode()
  const text = useColorModeValue('dark', 'light')
  const isActive = useColorModeValue(true, false)

  return (
    <>
      <IconButton
        size='md'
        fontSize='lg'
        variant='ghost'
        isRound
        colorScheme='blue'
        marginLeft='2'
        onClick={toggleColorMode}
        icon={<FaMoon />}
        isActive={!isActive}
        aria-label={`Switch to ${text} mode`}
        {...props}
      />
    </>
  )
}
