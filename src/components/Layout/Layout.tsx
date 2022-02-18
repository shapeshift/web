import { Box, Container, Flex } from '@chakra-ui/react'
import React from 'react'
import { Route } from 'Routes/helpers'

import { Header } from './Header/Header'

export const Layout = ({ route }: { route: Route }) => {
  const MainComponent = route.main as React.ElementType
  return (
    <Flex>
      <Header route={route} />
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
        <Box display={{ base: 'block', md: 'flex' }} width='full'>
          <Box flex={1}>
            <Box id='content' mx='auto' minH='76vh'>
              <Flex mx='auto' px={{ base: 0, lg: 0 }} flexDir={{ base: 'column', lg: 'row' }}>
                {route.main && <MainComponent route={route} />}
              </Flex>
            </Box>
          </Box>
        </Box>
      </Container>
    </Flex>
  )
}
