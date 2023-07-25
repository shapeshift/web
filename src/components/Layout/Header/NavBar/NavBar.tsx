import type { StackProps } from '@chakra-ui/react'
import { Divider, Stack, useColorModeValue, useMediaQuery } from '@chakra-ui/react'
import { union } from 'lodash'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as ReactRouterLink, matchPath, useLocation } from 'react-router-dom'
import type { Route } from 'Routes/helpers'
import { routes } from 'Routes/RoutesCommon'
import { YatBanner } from 'components/Banners/YatBanner'
import { Text } from 'components/Text'
import { usePlugins } from 'context/PluginProvider/PluginProvider'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { breakpoints } from 'theme/theme'

import { MainNavLink } from './MainNavLink'

type NavBarProps = {
  isCompact?: boolean
  onClick?: () => void
} & StackProps

export const NavBar = ({ isCompact, onClick, ...rest }: NavBarProps) => {
  const translate = useTranslate()
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { routes: pluginRoutes } = usePlugins()
  const isYatFeatureEnabled = useFeatureFlag('Yat')
  const groupColor = useColorModeValue('gray.400', 'gray.600')
  const dividerColor = useColorModeValue('gray.200', 'whiteAlpha.100')
  const { pathname } = useLocation()

  const navItemGroups = useMemo(() => {
    const allRoutes = union(routes, pluginRoutes).filter(route =>
      isLargerThanMd
        ? !route.disable && !route.hide
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

  const renderNavGroups = useMemo(() => {
    return navItemGroups.map((group, id) => {
      const [name, values] = group
      return (
        <Stack key={id}>
          {name && (
            <Text
              px={4}
              color={groupColor}
              fontSize='xs'
              textTransform='uppercase'
              fontWeight='bold'
              letterSpacing='wider'
              display={{ base: isCompact ? 'none' : 'block', '2xl': 'block' }}
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
  }, [groupColor, isCompact, navItemGroups, onClick, pathname, translate])

  return (
    <Stack
      width='full'
      flex='1 1 0%'
      spacing={6}
      divider={<Divider borderColor={dividerColor} />}
      {...rest}
    >
      {renderNavGroups}
      {isYatFeatureEnabled && <YatBanner isCompact={isCompact} />}
    </Stack>
  )
}
