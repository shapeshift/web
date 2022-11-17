import type { ContainerProps } from '@chakra-ui/react'
import {
  Container,
  Flex,
} from '@chakra-ui/react'
import React, { } from 'react'
import { Header } from './Header/Header'
import { SideNav } from './Header/SideNav'

export const Layout: React.FC<ContainerProps> = ({ children, ...rest }) => {
  return (
    <>
      <Header />

      <Flex maxWidth='container.3xl' margin='0 auto'>
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
          <>
            {children}
          </>
        </Container>
      </Flex>
    </>
  )
}
