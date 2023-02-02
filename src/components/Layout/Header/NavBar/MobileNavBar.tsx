import { Button, Flex } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { union } from 'lodash'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as ReactRouterLink, useLocation } from 'react-router-dom'
import { routes } from 'Routes/RoutesCommon'
import { usePlugins } from 'context/PluginProvider/PluginProvider'

export const MobileNavBar = () => {
  const { routes: pluginRoutes } = usePlugins()
  const translate = useTranslate()
  const allRoutes = union(routes, pluginRoutes)
    .filter(route => !route.disable && !route.hide && route.mobileNav)
    .sort((a, b) =>
      bnOrZero(a?.priority ?? 0)
        .minus(b?.priority ?? 0)
        .toNumber(),
    )
  const location = useLocation()

  const renderMenu = useMemo(() => {
    return allRoutes.map(route => {
      const isActive = location?.pathname.includes(route?.path ?? '')
      return (
        <Button
          as={ReactRouterLink}
          to={route.path}
          flexDir='column'
          fontSize='2xl'
          gap={2}
          height='auto'
          variant='nav-link'
          isActive={isActive}
          _active={{ bg: 'transparent', svg: { color: 'blue.200' } }}
          py={2}
        >
          {route.icon}
          <Flex flexDir='column' fontSize='xs'>
            {translate(route.shortLabel ?? route.label)}
          </Flex>
        </Button>
      )
    })
  }, [allRoutes, location?.pathname, translate])
  return (
    <Flex
      position='fixed'
      bottom={0}
      left={0}
      width='100%'
      bg='gray.800'
      zIndex='banner'
      justifyContent='space-between'
      height='72px'
    >
      {renderMenu}
    </Flex>
  )
}
