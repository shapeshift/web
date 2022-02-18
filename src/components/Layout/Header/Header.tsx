import { chakra, useColorModeValue } from '@chakra-ui/react'
import { useViewportScroll } from 'framer-motion'
import React, { useEffect, useRef, useState } from 'react'
import { Route } from 'Routes/helpers'

import { HeaderContent } from './HeaderContent'

export const NAV_PADDING = { base: 6, lg: 16 }

export const Header = ({ route }: { route: Route }) => {
  const bg = useColorModeValue('white', 'gray.850')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const ref = useRef<HTMLHeadingElement>()
  const [y, setY] = useState(0)
  const { height = 0 } = ref.current?.getBoundingClientRect() ?? {}
  const { scrollY } = useViewportScroll()
  useEffect(() => {
    return scrollY.onChange(() => setY(scrollY.get()))
  }, [scrollY])

  return (
    <>
      <chakra.header
        shadow={y > height ? 'lg' : undefined}
        transition='box-shadow 0.2s, background-color 0.2s'
        paddingTop={`env(safe-area-inset-top)`}
        zIndex='banner'
        bg={bg}
        borderRightWidth={1}
        borderColor={borderColor}
        left='0'
        right='0'
        height='100vh'
        position='sticky'
        top={0}
        maxWidth='xs'
        flex='1 1 0%'
      >
        <HeaderContent route={route} />
      </chakra.header>
    </>
  )
}
