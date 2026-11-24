import { SimpleGrid } from '@chakra-ui/react'
import { union } from 'lodash'
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import ResizeObserver from 'resize-observer-polyfill'

import { MobileNavLink } from './MobileNavLink'

import { usePlugins } from '@/context/PluginProvider/PluginProvider'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { Route } from '@/Routes/helpers'
import { routes } from '@/Routes/RoutesCommon'

const displayProp = { base: 'grid', md: 'none' }

export const MobileNavBar = memo(() => {
  const { routes: pluginRoutes } = usePlugins()
  const navRef = useRef<HTMLDivElement>(null)
  const allRoutes = useMemo(() => {
    return union(routes, pluginRoutes)
      .filter(
        (
          route,
        ): route is Extract<Route, { priority: number }> & Extract<Route, { label: string }> =>
          !route.disable && !route.hide && !!route.mobileNav,
      )
      .sort((a, b) => bnOrZero(a.priority).minus(b.priority).toNumber())
  }, [pluginRoutes])

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const setNavOffset = () => {
      document.body.style.setProperty('--mobile-nav-offset', `${nav.clientHeight}px`)
    }

    const resizeObserver = new ResizeObserver(setNavOffset)
    resizeObserver.observe(nav)
    setNavOffset()

    return () => resizeObserver.disconnect()
  }, [])

  return (
    <>
      <SimpleGrid
        position='fixed'
        bottom={0}
        left={0}
        width='100%'
        gridTemplateColumns='1fr 1fr 1fr 1fr'
        zIndex='banner'
        alignItems='center'
        paddingBottom='calc(env(safe-area-inset-bottom, 16px) + var(--safe-area-inset-bottom))'
        bg='background.surface.base'
        display={displayProp}
        ref={navRef}
      >
        {allRoutes.map((route, index) => (
          <MobileNavLink key={route.path} {...route} order={index < 2 ? index + 1 : index + 2} />
        ))}
      </SimpleGrid>
    </>
  )
})
