import { Box, Container, Flex } from '@chakra-ui/react'
import React from 'react'
import { Route } from 'Routes/helpers'

import { Header } from './Header/Header'
import { LeftSidebar } from './LeftSidebar'
import { RightSidebar } from './RightSidebar'

export const Layout = ({ route }: { route: Route }) => {
  return (
    <>
      <Header route={route} />
      <Container
        as='main'
        maxWidth='full'
        width='full'
        paddingBottom={{ base: 'calc(57px + env(safe-area-inset-bottom))', md: 0 }}
        marginInline='auto'
        paddingInlineStart='0'
        paddingInlineEnd='0'
      >
        <Box display={{ base: 'block', md: 'flex' }} width='full'>
          <Box flex={1}>
            <Box id='content' mx='auto' minH='76vh'>
              <Flex
                maxWidth={{ base: 'auto', '2xl': '1464px' }}
                mx='auto'
                px={{ base: 0, lg: 4 }}
                flexDir={{ base: 'column', lg: 'row' }}
              >
                {route?.leftSidebar && <LeftSidebar route={route}>{route.leftSidebar}</LeftSidebar>}
                {route.main}
                {route?.rightSidebar && <RightSidebar>{route.rightSidebar}</RightSidebar>}
              </Flex>
            </Box>
          </Box>
        </Box>
      </Container>
    </>
  )
}
