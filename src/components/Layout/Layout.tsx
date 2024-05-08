import type { ContainerProps } from '@chakra-ui/react'
import { Container, Flex } from '@chakra-ui/react'
import React, { useMemo } from 'react'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { Header } from './Header/Header'
import { MobileNavBar } from './Header/NavBar/MobileNavBar'
import { SideNav } from './Header/SideNav'

const widthProp = { base: 'full', md: 'calc(100% - 93px)', '2xl': 'calc(100% - 384px)' }
const paddingBottomProp = { base: 'calc(0 + env(safe-area-inset-bottom))', md: 0 }

export const Layout: React.FC<ContainerProps> = ({ children, ...rest }) => {
  const { currentRoute } = useBrowserRouter()
  const hideNav = useMemo(
    () =>
      (currentRoute && currentRoute.hideMobileMenu) ??
      (currentRoute && currentRoute.parent?.hideMobileMenu),
    [currentRoute],
  )
  return (
    <Flex margin='0 auto'>
      <SideNav />
      <Container
        as='main'
        display='flex'
        maxWidth='full'
        flexDir='column'
        width={widthProp}
        paddingBottom={paddingBottomProp}
        marginInline='auto'
        paddingInlineStart='0'
        paddingInlineEnd='0'
        flex='1 1 0%'
        {...rest}
      >
        <Header />
        {children}
        {!hideNav && <MobileNavBar />}
      </Container>
    </Flex>
  )
}
