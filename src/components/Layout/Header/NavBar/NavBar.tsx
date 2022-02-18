import { Stack, StackProps } from '@chakra-ui/react'
import union from 'lodash/union'
import { pluginManager } from 'plugins'
import { useTranslate } from 'react-polyglot'
import { routes } from 'Routes/Routes'

import { MainNavLink } from './MainNavLink'
export const NavBar = (props: StackProps) => {
  const translate = useTranslate()

  return (
    <Stack width='full' flex='1 1 0%' {...props}>
      {union(routes, pluginManager.getRoutes())
        .filter(route => !route.disable)
        .map(item => {
          return (
            <>
              <MainNavLink
                key={item.label}
                icon={item.icon}
                href={item.path}
                to={item.path}
                label={translate(item.label)}
                aria-label={translate(item.label)}
                data-test={`navbar-${item.label.split('.')[1]}-button`}
              />
            </>
          )
        })}
    </Stack>
  )
}
