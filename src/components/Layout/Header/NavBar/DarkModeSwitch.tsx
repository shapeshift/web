import { MoonIcon } from '@chakra-ui/icons'
import { Box, Circle, MenuItem, Switch, SwitchProps, useColorMode } from '@chakra-ui/react'

export const DarkModeSwitch = (props: SwitchProps) => {
  const { colorMode, toggleColorMode } = useColorMode()
  const isDark = colorMode === 'dark'
  return (
    <MenuItem
      justifyContent='space-between'
      onClick={toggleColorMode}
      icon={
        <Circle bg='whiteAlpha.200' size={8}>
          <MoonIcon />
        </Circle>
      }
    >
      <Box flex={1} justifyContent='space-between' display='flex' alignItems='center'>
        Dark Mode
        <Switch colorScheme='blue' isChecked={isDark} onChange={toggleColorMode} {...props} />
      </Box>
    </MenuItem>
  )
}
