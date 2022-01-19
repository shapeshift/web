import { Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/menu'
import { IconButton } from '@chakra-ui/react'
import React from 'react'
import { FaGlobe } from 'react-icons/fa'
import { Text } from 'components/Text'

export const LanguageDropdown = () => {
  // TO-DO: Learn and implement Reacts State Management to save user Locale
  const setLocale = React.useState('en')

  // TO-DO: Create function to iterate through list of activated locales
  return (
    <Menu>
      <MenuButton as={IconButton} display={'inline-grid'} marginRight={4}>
        <FaGlobe />
      </MenuButton>
      <MenuList width={'auto'} maxWidth='100%' minWidth={8}>
        <MenuItem onClick={e => setLocale('en')}>
          <Text translation='navBar.locale.en' />
        </MenuItem>
        <MenuItem onClick={e => setLocale('es')}>
          <Text translation='navBar.locale.es' />
        </MenuItem>
      </MenuList>
    </Menu>
  )
}
