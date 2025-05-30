import type { ContainerProps } from '@chakra-ui/react'
import { Container, Flex } from '@chakra-ui/react'
import React from 'react'

import { Header } from './Header/Header'
import { MobileNavBar } from './Header/NavBar/MobileNavBar'
import { SideNav } from './Header/SideNav'

const widthProp = { base: 'full', md: 'calc(100% - 93px)', '2xl': 'calc(100% - 384px)' }
const paddingBottomProp = {
  base: 'calc(0 + env(safe-area-inset-bottom) + var(--safe-area-inset-bottom))',
  md: 0,
}

export const Layout: React.FC<ContainerProps> = ({ children, ...rest }) => {
  return (
    <Flex margin='0 auto'>
      <SideNav />
      <Container
        as='main'
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
        <MobileNavBar />
      </Container>
    </Flex>
  )
}
