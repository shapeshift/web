import {
  Box,
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
  const { isOpen, onOpen, onClose } = useDisclosure()
  const location = useLocation()

  // Use the first item's path as default if no defaultPath is provided
  const defaultRoute = defaultPath || items[0]?.path || '/'

  // Check if any of the dropdown's items match the current path
  const isActive = useMemo(() => {
    const currentPath = location.pathname
    
    // Special case for Trade dropdown - check for trade, limit, claim, and ramp paths
    if (label === 'Trade') {
      return (
        currentPath.startsWith('/trade') ||
        currentPath.startsWith('/limit') ||
        currentPath.startsWith('/claim') ||
        currentPath.startsWith('/ramp')
      )
    }
    
    // Special case for Explore dropdown - check for assets, markets, and explore paths
    if (label === 'Explore') {
      return (
        currentPath.startsWith('/assets') ||
        currentPath.startsWith('/markets') ||
        currentPath.startsWith('/explore')
      )
    }
    
    // For other dropdowns, check if current path matches any item path
    return items.some(item => currentPath.startsWith(item.path))
  }, [location.pathname, label, items])

  return (
    <Menu isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
      <MenuButton
        as={ReactRouterLink}
        to={defaultRoute}
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        variant='unstyled'
        px={3}
        py={2}
        borderRadius='md'
        _hover={{
          bg: 'background.surface.elevated',
        }}
        _active={{
          bg: 'transparent',
        }}
      >
        <Box
          fontSize='md'
          fontWeight={isActive ? 'semibold' : 'medium'}
          color={isActive ? 'white' : 'whiteAlpha.600'}
        >
          {label}
        </Box>
      </MenuButton>
      <MenuList
        bg='whiteAlpha.100'
        backdropFilter='blur(20px)'
        border='1px solid'
        borderColor='whiteAlpha.200'
        boxShadow='xl'
        minW='200px'
        py={2}
        borderRadius='lg'
        mt={2}
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
      >
        {items.map(item => {
          const isItemActive = location.pathname.startsWith(item.path)
          
          return (
            <MenuItem
              key={item.path}
              as={ReactRouterLink}
              to={item.path}
              bg={isItemActive ? 'whiteAlpha.200' : 'transparent'}
              color={isItemActive ? 'white' : 'whiteAlpha.800'}
              _hover={{
                bg: 'whiteAlpha.200',
                color: 'white',
              }}
              _focus={{
                bg: 'whiteAlpha.200',
                color: 'white',
              }}
              borderRadius='md'
              mx={2}
              my={1}
              px={3}
              py={2}
            >
              <HStack spacing={3}>
                {item.icon && (
                  <Icon
                    as={item.icon}
                    boxSize={4}
                    color={isItemActive ? 'white' : 'whiteAlpha.600'}
                  />
                )}
                <Text
                  fontSize='sm'
                  fontWeight={isItemActive ? 'semibold' : 'medium'}
                >
                  {item.label}
                </Text>
              </HStack>
            </MenuItem>
          )
        })}
      </MenuList>
    </Menu>
  )
}
