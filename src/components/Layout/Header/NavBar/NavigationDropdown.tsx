import {
  Box,
  Button,
  HStack,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { FaCreditCard, FaExchangeAlt } from 'react-icons/fa'
import { RiExchangeFundsLine } from 'react-icons/ri'
import { TbGraph } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { Link as ReactRouterLink, useLocation } from 'react-router-dom'

type NavigationDropdownProps = {
  label: string
  items: {
    label: string
    path: string
    icon?: React.ComponentType
  }[]
  defaultPath?: string
}

export const NavigationDropdown = ({ label, items, defaultPath }: NavigationDropdownProps) => {
  const translate = useTranslate()
  const { isOpen, onOpen, onClose } = useDisclosure()

  // Use the first item's path as default if no defaultPath is provided
  const defaultRoute = defaultPath || items[0]?.path || '/'

  return (
    <Menu isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
      <MenuButton
        as={ReactRouterLink}
        to={defaultRoute}
        variant='ghost'
        size='md'
        fontSize='md'
        fontWeight='medium'
        color='text.subtle'
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        _hover={{
          color: 'text.base',
          bg: 'background.surface.elevated',
          textDecoration: 'none',
        }}
        _active={{
          bg: 'background.surface.elevated',
        }}
      >
        {label}
      </MenuButton>
      <MenuList
        bg='background.surface.base'
        border='1px solid'
        borderColor='border.base'
        boxShadow='xl'
        minW='200px'
        py={2}
        borderRadius='lg'
        mt={2}
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
      >
        {items.map(item => (
          <MenuItem
            key={item.path}
            as={ReactRouterLink}
            to={item.path}
            bg='transparent'
            color='text.subtle'
            _hover={{
              bg: 'background.surface.hover',
              color: 'text.base',
            }}
            _focus={{
              bg: 'background.surface.hover',
              color: 'text.base',
            }}
            borderRadius='md'
            mx={2}
            my={1}
            px={3}
            py={2}
          >
            <HStack spacing={3}>
              {item.icon && <Icon as={item.icon} boxSize={4} color='text.subtle' />}
              <Text fontSize='sm' fontWeight='medium'>
                {item.label}
              </Text>
            </HStack>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  )
}
