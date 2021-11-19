import { Button } from '@chakra-ui/button'
import { Stack } from '@chakra-ui/layout'
import { useTranslate } from 'react-polyglot'
import { matchPath, NavLink, useLocation } from 'react-router-dom'
import { pathTo, Route } from 'Routes/helpers'
import { IconCircle } from 'components/IconCircle'

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
      leftIcon={<IconCircle>{icon}</IconCircle>}
      justifyContent='flex-start'
      variant='ghost'
      isActive={match}
      size='lg'
      px={4}
      fontWeight='medium'
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
  if (!routes?.length) return null
  return (
    <Stack>
      {routes
        .filter(route => !route.disable)
        .map((route, index) => (
          <MenuLink {...route} index={index} key={index} />
        ))}
    </Stack>
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
