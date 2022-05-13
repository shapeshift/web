import { Stack, StackProps } from '@chakra-ui/react'
import { union } from 'lodash'
import { useTranslate } from 'react-polyglot'
import { Link as ReactRouterLink } from 'react-router-dom'
import { routes } from 'Routes/RoutesCommon'
import { usePlugins } from 'context/PluginProvider/PluginProvider'

import { MainNavLink } from './MainNavLink'

type NavBarProps = {
  isCompact?: boolean
} & StackProps

export const NavBar = ({ isCompact, ...rest }: NavBarProps) => {
  const translate = useTranslate()
  const { routes: pluginRoutes } = usePlugins()

  return (
    <Stack width='full' flex='1 1 0%' {...rest}>
      {union(routes, pluginRoutes)
        .filter(route => !route.disable && !route.hide)
        .map((item, idx) => {
          return (
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
          )
        })}
    </Stack>
  )
}
