import { Button } from '@chakra-ui/button'
import { Box, Container, HStack } from '@chakra-ui/layout'
import { useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { matchPath, NavLink, useLocation } from 'react-router-dom'
import { pathTo, Route } from 'Routes/helpers'

type MenuLinkProps = {
  index: number
} & Route

const MenuLink = ({ index, path, icon, label }: MenuLinkProps) => {
  const location = useLocation()
  const translate = useTranslate()
  const match = matchPath(location.pathname, { path, exact: true }) != null
  return (
    <Button
      key={index}
      to={path}
      as={NavLink}
      leftIcon={icon}
      variant='tab'
      colorScheme='blue'
      isActive={match}
    >
      {translate(label)}
    </Button>
  )
}

type MenuProps = {
  routes?: Route[]
  level: number
}

const Menu = ({ routes, level }: MenuProps) => {
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  const routeList = useMemo(() => {
    if (!routes) return []
    return routes
      .filter(route => !route.disable && !route.hide)
      .map((route, index) => <MenuLink {...route} index={index} key={index} />)
  }, [routes])

  if (!routeList?.length) return null
  return (
    <Box
      borderBottom='1px'
      borderColor={borderColor}
      bg={bg}
      position='sticky'
      top={70}
      zIndex='banner'
    >
      <Container maxW='container.xl'>
        <HStack>{routeList}</HStack>
      </Container>
    </Box>
  )
}

type NestedMenuType = {
  route?: Route
}

export const NestedMenu = ({ route }: NestedMenuType) => {
  if (!route) return null

  return (
    <>
      {pathTo(route)
        .filter(r => r.routes)
        .map((r, index) => (
          <Menu key={index} routes={r.routes} level={index} />
        ))}
    </>
  )
}
