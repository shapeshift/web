import { HStack, StackProps } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { routes } from 'Routes/Routes'

import { MainNavLink } from './MainNavLink'
import { useWallet } from 'context/WalletProvider/WalletProvider'

export const NavBar = (props: StackProps) => {
  const translate = useTranslate()
  const { state } = useWallet()
  return (
    <HStack spacing={12} ml='auto' mr='auto' alignSelf='center' {...props}>
      {routes
        .filter(route => !route.disable && (state.isConnected || !route.requiresWallet))
        .map(item => (
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
