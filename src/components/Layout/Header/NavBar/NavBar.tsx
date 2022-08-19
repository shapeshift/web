import { Stack, StackProps, useColorModeValue } from '@chakra-ui/react'
import { union } from 'lodash'
import { useTranslate } from 'react-polyglot'
import { Link as ReactRouterLink } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { routes } from 'Routes/RoutesCommon'
import { Text } from 'components/Text'
import { usePlugins } from 'context/PluginProvider/PluginProvider'

import { MainNavLink } from './MainNavLink'

type NavBarProps = {
  isCompact?: boolean
} & StackProps

export const NavBar = ({ isCompact, ...rest }: NavBarProps) => {
  const translate = useTranslate()
  const { routes: pluginRoutes } = usePlugins()
  const groupColor = useColorModeValue('gray.300', 'gray.600')

  const allRoutes = union(routes, pluginRoutes).filter(route => !route.disable && !route.hide)
  const groups = allRoutes.reduce(
    (entryMap, e) => entryMap.set(e.category, [...(entryMap.get(e.category) || []), e]),
    new Map(),
  )
  const groupArray = Array.from(groups.entries())

  return (
    <Stack width='full' flex='1 1 0%' spacing={6} {...rest}>
      {groupArray.map((group, id) => {
        const name = group[0]
        const values = group[1]
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
                display={{ base: 'none', xl: 'block' }}
                translation={`navBar.${name}`}
              />
            )}
            {values.map((item: Route, idx: number) => (
              <MainNavLink
                isCompact={isCompact}
                as={ReactRouterLink}
                key={idx}
                leftIcon={item.icon}
                href={item.path}
                to={item.path}
                label={translate(item.label)}
                aria-label={translate(item.label)}
                data-test={`navigation-${item.label.split('.')[1]}-button`}
              />
            ))}
          </Stack>
        )
      })}
    </Stack>
  )
}
