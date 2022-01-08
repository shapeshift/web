import { HStack, StackProps } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { routesShift } from 'Routes/Routes'

import { MainNavLink } from './MainNavLink'

export const NavBar = (props: StackProps) => {
  const translate = useTranslate()
  return (
    <HStack spacing={12} ml='auto' mr='auto' alignSelf='center' {...props}>
      {routesShift
        .filter(route => !route.disable)
        .map(item => (
          <MainNavLink
            key={item.label}
            icon={item.icon}
            href={item.path}
            to={item.path}
            label={translate(item.label)}
            aria-label={translate(item.label)}
            children={undefined}
          />
        ))}
    </HStack>
  )
}
