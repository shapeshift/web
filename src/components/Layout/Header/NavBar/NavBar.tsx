import { HStack, StackProps } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { routes } from 'Routes/Routes'

import { MainNavLink } from './MainNavLink'

export const NavBar = (props: StackProps) => {
  const translate = useTranslate()
  return (
    <HStack spacing={12} ml='auto' mr='auto' alignSelf='center' {...props}>
      {routes.map(item => (
        <MainNavLink
          key={item.label}
          icon={item.icon}
          href={item.path}
          to={item.path}
          label={translate(item.label)}
          aria-label={translate(item.label)}
        />
      ))}
    </HStack>
  )
}
