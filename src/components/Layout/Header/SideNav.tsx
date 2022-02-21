import { chakra, useColorModeValue } from '@chakra-ui/react'
import React from 'react'
import { Route } from 'Routes/helpers'

import { SideNavContent } from './SideNavContent'

export const NAV_PADDING = { base: 6, lg: 16 }

export const SideNav = ({ route }: { route: Route }) => {
  const bg = useColorModeValue('white', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')

  return (
    <>
      <chakra.header
        paddingTop={`env(safe-area-inset-top)`}
        zIndex='banner'
        bg={bg}
        borderRightWidth={1}
        borderColor={borderColor}
        left='0'
        right='0'
        height='calc(100vh - 4.5rem)'
        position='sticky'
        top='4.5rem'
        maxWidth='xs'
        flex='1 1 0%'
        display={{ base: 'none', md: 'flex' }}
      >
        <SideNavContent route={route} />
      </chakra.header>
    </>
  )
}
