import type { StackProps } from '@chakra-ui/react'
import { Divider, Stack, useColorModeValue, useMediaQuery } from '@chakra-ui/react'
import { union } from 'lodash'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as ReactRouterLink, matchPath, useLocation } from 'react-router-dom'
import type { Route } from 'Routes/helpers'
import { RouteCategory } from 'Routes/helpers'
import { routes } from 'Routes/RoutesCommon'
import { Text } from 'components/Text'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { breakpoints } from 'theme/theme'

import { MainNavLink } from './MainNavLink'

type NavBarProps = {
  isCompact?: boolean
  onClick?: () => void
} & StackProps

const flex = { base: 'none', md: '1 1 0%' }

export const NavBar = (props: NavBarProps) => {
  const { isCompact, onClick, stackProps } = useMemo(() => {
    const { isCompact, onClick, ...stackProps } = props
    return { isCompact, onClick, stackProps }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, Object.values(props))

  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const { routes: pluginRoutes } = usePlugins()
  const groupColor = useColorModeValue('gray.400', 'gray.600')
  const dividerColor = useColorModeValue('gray.200', 'whiteAlpha.100')
  const { pathname } = useLocation()

  const navItemGroups = useMemo(() => {
    const allRoutes = union(routes, pluginRoutes).filter(route =>
      isLargerThanMd
        ? !route.disable && !route.hide && !route.hideDesktop
        : !route.disable && !route.hide && !route.mobileNav,
    )
    const groups = allRoutes.reduce(
      (entryMap, currentRoute) =>
        entryMap.set(currentRoute.category, [
          ...(entryMap.get(currentRoute.category) || []),
          currentRoute,
        ]),
      new Map(),
    )
    return Array.from(groups.entries())
  }, [isLargerThanMd, pluginRoutes])

  const displayProp = useMemo(
    () => ({ base: isCompact ? 'none' : 'block', '2xl': 'block' }),
    [isCompact],
  )

  const renderNavGroups = useMemo(() => {
    return navItemGroups.map((group, id) => {
      const [name, values] = group
      return (
        <Stack key={id}>
          {name && name !== RouteCategory.Featured && isLargerThanMd && (
            <Text
              px={4}
              color={groupColor}
              fontSize='xs'
              textTransform='uppercase'
              fontWeight='bold'
              letterSpacing='wider'
              display={displayProp}
              translation={`navBar.${name}`}
            />
          )}
          {values.map((item: Route, id: number) => (
            <MainNavLink
              isCompact={isCompact}
              as={ReactRouterLink}
              key={id}
              leftIcon={item.icon}
              href={item.path}
              to={item.path}
              isNew={item.isNew}
              size='lg'
              onClick={onClick}
              label={translate(item.label)}
              aria-label={translate(item.label)}
              data-test={`navigation-${item.label.split('.')[1]}-button`}
              isActive={
                !!matchPath(pathname, {
                  path: item.path,
                  exact: false,
                  strict: false,
                })
              }
            />
          ))}
        </Stack>
      )
    })
  }, [
    displayProp,
    groupColor,
    isCompact,
    isLargerThanMd,
    navItemGroups,
    onClick,
    pathname,
    translate,
  ])

  const divider = useMemo(() => <Divider borderColor={dividerColor} />, [dividerColor])

  return (
    <Stack width='full' flex={flex} spacing={6} divider={divider} {...stackProps}>
      {renderNavGroups}
    </Stack>
  )
}
