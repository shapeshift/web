import type { StackProps } from '@chakra-ui/react'
import { Divider, Stack, useColorModeValue } from '@chakra-ui/react'
import { union } from 'lodash'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as ReactRouterLink } from 'react-router-dom'
import type { Route } from 'Routes/helpers'
import { routes } from 'Routes/RoutesCommon'
import { Text } from 'components/Text'
import { usePlugins } from 'context/PluginProvider/PluginProvider'

import { MainNavLink } from './MainNavLink'

type NavBarProps = {
  isCompact?: boolean
  onClick?: () => void
} & StackProps

export const NavBar = ({ isCompact, onClick, ...rest }: NavBarProps) => {
  const translate = useTranslate()
  const { routes: pluginRoutes } = usePlugins()
  const groupColor = useColorModeValue('gray.300', 'gray.600')

  const navItemGroups = useMemo(() => {
    const allRoutes = union(routes, pluginRoutes).filter(route => !route.disable && !route.hide)
    const groups = allRoutes.reduce(
      (entryMap, currentRoute) =>
        entryMap.set(currentRoute.category, [
          ...(entryMap.get(currentRoute.category) || []),
          currentRoute,
        ]),
      new Map(),
    )
    return Array.from(groups.entries())
  }, [pluginRoutes])

  return (
    <Stack width='full' flex='1 1 0%' spacing={6} divider={<Divider />} {...rest}>
      {navItemGroups.map((group, id) => {
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
                size='lg'
                onClick={onClick}
                label={translate(item.label)}
                aria-label={translate(item.label)}
                data-test={`navigation-${item.label.split('.')[1]}-button`}
              />
            ))}
          </Stack>
        )
      })}
      {/* {isYatFeatureEnabled && <YatBanner isCompact={isCompact} />} */}
    </Stack>
  )
}
