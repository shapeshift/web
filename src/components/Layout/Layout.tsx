import { Container, ContainerProps, Flex } from '@chakra-ui/react'
import React from 'react'

import { Header } from './Header/Header'
import { SideNav } from './Header/SideNav'

type LayoutProps = ContainerProps

export const Layout: React.FC<LayoutProps> = ({ children, ...rest }) => {
  return (
    <>
      <Header />

      <Flex>
        <SideNav />
        <Container
          as='main'
          maxWidth='full'
          width='full'
          paddingBottom={{ base: 'calc(0 + env(safe-area-inset-bottom))', md: 0 }}
          marginInline='auto'
          paddingInlineStart='0'
          paddingInlineEnd='0'
          flex='1 1 0%'
          {...rest}
        >
          {children}
        </Container>
      </Flex>
    </>
  )
}
