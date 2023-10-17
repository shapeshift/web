import { Flex } from '@chakra-ui/react'
import { union } from 'lodash'
import { memo, useMemo } from 'react'
import { routes } from 'Routes/RoutesCommon'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { MobileNavLink } from './MobileNavLink'

const displayProp = { base: 'flex', md: 'none' }

export const MobileNavBar = memo(() => {
  const { routes: pluginRoutes } = usePlugins()
  const allRoutes = useMemo(
    () =>
      union(routes, pluginRoutes)
        .filter(route => !route.disable && !route.hide && route.mobileNav)
        // route mobileNav discriminated union narrowing is lost by the Array.prototype.sort() call
        .sort((a, b) => bnOrZero(a.priority!).minus(b.priority!).toNumber()),
    [pluginRoutes],
  )

  return (
    <Flex
      position='fixed'
      bottom={0}
      left={0}
      width='100%'
      bg='background.surface.base'
      zIndex='banner'
      justifyContent='space-between'
      px={4}
      paddingBottom='calc(env(safe-area-inset-bottom, 16px) - 16px)'
      display={displayProp}
    >
      {allRoutes.map(route => (
        <MobileNavLink key={route.path} {...route} />
      ))}
    </Flex>
  )
})
