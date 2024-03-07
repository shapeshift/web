import { Flex, useColorModeValue } from '@chakra-ui/react'
import { union } from 'lodash'
import { memo, useLayoutEffect, useMemo } from 'react'
import { routes } from 'Routes/RoutesCommon'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { MobileNavLink } from './MobileNavLink'

const displayProp = { base: 'flex', md: 'none' }

export const MobileNavBar = memo(() => {
  const bg = useColorModeValue(
    `linear-gradient(
      to top,
      hsl(0, 0%, 100%) 0%,
      hsla(0, 0%, 100%, 0.987) 18%,
      hsla(0, 0%, 100%, 0.951) 32.5%,
      hsla(0, 0%, 100%, 0.896) 43.8%,
      hsla(0, 0%, 100%, 0.825) 52.4%,
      hsla(0, 0%, 100%, 0.741) 58.8%,
      hsla(0, 0%, 100%, 0.648) 63.4%,
      hsla(0, 0%, 100%, 0.55) 66.7%,
      hsla(0, 0%, 100%, 0.45) 69.1%,
      hsla(0, 0%, 100%, 0.352) 71.1%,
      hsla(0, 0%, 100%, 0.259) 73.2%,
      hsla(0, 0%, 100%, 0.175) 75.7%,
      hsla(0, 0%, 100%, 0.104) 79.2%,
      hsla(0, 0%, 100%, 0.049) 84.1%,
      hsla(0, 0%, 100%, 0.013) 90.9%,
      hsla(0, 0%, 100%, 0) 100%
    );`,
    `linear-gradient(
      to top,
      hsl(211, 11%, 7%) 0%,
      hsla(211, 11%, 7%, 0.987) 18.4%,
      hsla(211, 11%, 7%, 0.951) 33.7%,
      hsla(211, 11%, 7%, 0.896) 46.3%,
      hsla(211, 11%, 7%, 0.825) 56.5%,
      hsla(211, 11%, 7%, 0.741) 64.6%,
      hsla(211, 11%, 7%, 0.648) 70.9%,
      hsla(211, 11%, 7%, 0.55) 75.8%,
      hsla(211, 11%, 7%, 0.45) 79.5%,
      hsla(211, 11%, 7%, 0.352) 82.4%,
      hsla(211, 11%, 7%, 0.259) 84.7%,
      hsla(211, 11%, 7%, 0.175) 86.9%,
      hsla(211, 11%, 7%, 0.104) 89.2%,
      hsla(211, 11%, 7%, 0.049) 92%,
      hsla(211, 11%, 7%, 0.013) 95.4%,
      hsla(211, 11%, 7%, 0) 100%
    );`,
  )
  const { routes: pluginRoutes } = usePlugins()
  const allRoutes = useMemo(
    () =>
      union(routes, pluginRoutes)
        .filter(route => !route.disable && !route.hide && route.mobileNav)
        // route mobileNav discriminated union narrowing is lost by the Array.prototype.sort() call
        .sort((a, b) => bnOrZero(a.priority!).minus(b.priority!).toNumber()),
    [pluginRoutes],
  )
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
    <Flex
      position='fixed'
      bottom={0}
      left={0}
      width='100%'
      bgImage={bg}
      pt={6}
      zIndex='banner'
      paddingBottom='calc(env(safe-area-inset-bottom, 16px) - 16px)'
      display={displayProp}
      className='mobile-nav'
    >
      {allRoutes.map(route => (
        <MobileNavLink key={route.path} {...route} />
      ))}
    </Flex>
  )
})
