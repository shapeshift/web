import {
  Box,
  Button,
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

import { useHoverIntent } from '@/hooks/useHoverIntent'

const menuButtonHoverSx = { bg: 'background.surface.elevated' }
const menuButtonActiveSx = { bg: 'transparent' }

const menuItemHoverSx = { color: 'text.base' }
type NavigationDropdownItem = {
  label: string
  path: string
  icon?: React.ComponentType
}

type NavigationDropdownProps = {
  label: string
  items: NavigationDropdownItem[]
  defaultPath: string
}

export const NavigationDropdown = ({ label, items, defaultPath }: NavigationDropdownProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const location = useLocation()
  const navigate = useNavigate()
  const translate = useTranslate()

  const { handleMouseEnter, handleMouseLeave } = useHoverIntent(isOpen, onOpen, onClose)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1) {
        // Middle-click
        e.preventDefault()
        window.open(`#${defaultPath}`, '_blank')
      }
    },
    [defaultPath],
  )

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+click
        e.preventDefault()
        window.open(`#${defaultPath}`, '_blank')
      } else {
        navigate(defaultPath)
      }
    },
    [navigate, defaultPath],
  )

  const isActive = useMemo(() => {
    const currentPath = location.pathname

    if (label === 'common.trade') {
      return (
        currentPath.startsWith('/trade') ||
        currentPath.startsWith('/limit') ||
        currentPath.startsWith('/ramp')
      )
    }

    if (label === 'navBar.explore') {
      return currentPath.startsWith('/assets') || currentPath.startsWith('/markets')
    }

    return items.some(item => currentPath.startsWith(item.path))
  }, [location.pathname, label, items])

  const afterSx = useMemo(
    () => ({
      content: '""',
      position: 'absolute' as const,
      top: '100%',
      left: 0,
      right: 0,
      height: '20px',
      display: isOpen ? 'block' : 'none',
    }),
    [isOpen],
  )

  return (
    <Box
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      position='relative'
      _after={afterSx}
    >
      <Menu isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
        <MenuButton
          as={Button}
          variant='ghost'
          fontWeight='medium'
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          px={3}
          py={2}
          borderRadius='md'
          _hover={menuButtonHoverSx}
          _active={menuButtonActiveSx}
          aria-current={isActive ? 'page' : undefined}
        >
          <Box fontSize='md' color={isActive ? 'text.base' : 'text.subtle'}>
            {translate(label)}
          </Box>
        </MenuButton>
        <MenuList minW='200px' py={2} mt={0}>
          {items.map(item => {
            const isItemActive = location.pathname.startsWith(item.path)

            return (
              <MenuItem
                key={item.path}
                as={ReactRouterLink}
                to={item.path}
                color={isItemActive ? 'text.base' : 'text.subtle'}
                p={3}
                _hover={menuItemHoverSx}
                icon={item.icon && <Icon as={item.icon} boxSize={6} />}
              >
                <Text>{translate(item.label)}</Text>
              </MenuItem>
            )
          })}
        </MenuList>
      </Menu>
    </Box>
  )
}
