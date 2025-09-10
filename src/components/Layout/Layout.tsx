import type { ContainerProps } from '@chakra-ui/react'
import { Container, Flex } from '@chakra-ui/react'
import React from 'react'

import { Header } from './Header/Header'
import { MobileNavBar } from './Header/NavBar/MobileNavBar'

const widthProp = { base: 'full', md: 'full', '2xl': 'full' }
const paddingBottomProp = {
  base: 'calc(0 + env(safe-area-inset-bottom) + var(--safe-area-inset-bottom))',
  md: 0,
}
const paddingXProp = { base: 0, md: 8, lg: 12 }
const maxWidth = { base: 'full', '2xl': 'container.2xl' }

export const Layout: React.FC<ContainerProps> = ({ children, ...rest }) => {
  return (
    <Flex margin='0 auto' flexDir='column' minHeight='100vh'>
      <Header />
      <Container
        as='main'
        maxWidth={maxWidth}
        flexDir='column'
        width={widthProp}
        paddingBottom={paddingBottomProp}
        marginInline='auto'
        px={paddingXProp}
        flex='1 1 0%'
        {...rest}
      >
        {children}
        <MobileNavBar />
      </Container>
    </Flex>
  )
}
