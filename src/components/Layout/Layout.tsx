import { Container, Flex } from '@chakra-ui/react'
import React from 'react'
import { Route } from 'Routes/helpers'

import { Header } from './Header/Header'
import { SideNav } from './Header/SideNav'

export const Layout = ({ route }: { route: Route }) => {
  const MainComponent = route.main as React.ElementType
  return (
    <>
      <Header route={route} />

      <Flex>
        <SideNav route={route} />
        <Container
          as='main'
          maxWidth='full'
          width='full'
          paddingBottom={{ base: 'calc(0 + env(safe-area-inset-bottom))', md: 0 }}
          marginInline='auto'
          paddingInlineStart='0'
          paddingInlineEnd='0'
          flex='1 1 0%'
        >
          {route.main && <MainComponent route={route} />}
        </Container>
      </Flex>
    </>
  )
}
