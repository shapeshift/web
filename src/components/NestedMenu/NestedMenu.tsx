import { Button } from '@chakra-ui/button'
import { Stack } from '@chakra-ui/layout'
import { useTranslate } from 'react-polyglot'
import { NavLink, useParams } from 'react-router-dom'
import { pathTo, Route } from 'Routes/helpers'
import { IconCircle } from 'components/IconCircle'

type MenuLinkProps = {
  index: number
} & Route

const MenuLink = ({ index, path, icon, label }: MenuLinkProps) => {
  const translate = useTranslate()
  const params = useParams()
  return (
    <Button
      key={params.index}
      to={params.path}
      as={NavLink}
      leftIcon={<IconCircle>{params.icon}</IconCircle>}
      justifyContent='flex-start'
      variant='ghost'
      isActive={params ? true : false}
      size="large"
      px={4}
      fontWeight='medium'
    >
      {translate(params.label)}
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
