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
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as ReactRouterLink, useLocation, useNavigate } from 'react-router-dom'

type NavigationDropdownItem = {
  label: string
  path: string
  icon?: React.ComponentType
}

type NavigationDropdownProps = {
  label: string
  items: NavigationDropdownItem[]
  defaultPath?: string
}

export const NavigationDropdown = ({ label, items, defaultPath }: NavigationDropdownProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const location = useLocation()
  const navigate = useNavigate()
  const translate = useTranslate()

  const defaultRoute = defaultPath || items[0]?.path || '/'

  const handleClick = useCallback(() => navigate(defaultRoute), [navigate, defaultRoute])
  const hoverStyle = useMemo(() => ({ bg: 'background.surface.elevated' }), [])
  const activeStyle = useMemo(() => ({ bg: 'transparent' }), [])
  const menuItemHoverStyle = useMemo(() => ({ bg: 'whiteAlpha.200', color: 'white' }), [])
  const menuItemFocusStyle = useMemo(() => ({ bg: 'whiteAlpha.200', color: 'white' }), [])

  const isActive = useMemo(() => {
    const currentPath = location.pathname

    if (label === 'common.trade') {
      return (
        currentPath.startsWith('/trade') ||
        currentPath.startsWith('/limit') ||
        currentPath.startsWith('/claim') ||
        currentPath.startsWith('/ramp')
      )
    }

    if (label === 'navBar.explore') {
      return (
        currentPath.startsWith('/assets') ||
        currentPath.startsWith('/markets') ||
        currentPath.startsWith('/explore')
      )
    }

    return items.some(item => currentPath.startsWith(item.path))
  }, [location.pathname, label, items])

  return (
    <Menu isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
      <MenuButton
        onMouseEnter={onOpen}
        onMouseLeave={onClose}
        onClick={handleClick}
        px={3}
        py={2}
        borderRadius='md'
        bg='transparent'
        _hover={hoverStyle}
        _active={activeStyle}
        as={Box}
        cursor='pointer'
      >
        <Box
          fontSize='md'
          fontWeight={isActive ? 'semibold' : 'medium'}
          color={isActive ? 'white' : 'whiteAlpha.600'}
        >
          {translate(label)}
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
              _hover={menuItemHoverStyle}
              _focus={menuItemFocusStyle}
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
                <Text fontSize='sm' fontWeight={isItemActive ? 'semibold' : 'medium'}>
                  {translate(item.label)}
                </Text>
              </HStack>
            </MenuItem>
          )
        })}
      </MenuList>
    </Menu>
  )
}
