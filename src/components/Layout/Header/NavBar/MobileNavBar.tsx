import { SimpleGrid } from '@chakra-ui/react'
import { union } from 'lodash'
import { memo, useLayoutEffect, useMemo } from 'react'

import { MobileNavLink } from './MobileNavLink'

import { usePlugins } from '@/context/PluginProvider/PluginProvider'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { Route } from '@/Routes/helpers'
import { routes } from '@/Routes/RoutesCommon'

const displayProp = { base: 'grid', md: 'none' }

export const MobileNavBar = memo(() => {
  const { routes: pluginRoutes } = usePlugins()
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
    const body = document.body
    const nav = document.querySelector('.mobile-nav')
    if (window.visualViewport) {
      const vv = window.visualViewport
      const fixPosition = () => {
        if (body && nav) {
          body.style.setProperty('--mobile-nav-offset', `${nav.clientHeight}px`)
        }
      }
      vv.addEventListener('resize', fixPosition)
      fixPosition()
      return () => {
        window.removeEventListener('resize', fixPosition)
      }
    }
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
        className='mobile-nav'
      >
        {allRoutes.map((route, index) => (
          <MobileNavLink key={route.path} {...route} order={index < 2 ? index + 1 : index + 2} />
        ))}
      </SimpleGrid>
    </>
  )
})
