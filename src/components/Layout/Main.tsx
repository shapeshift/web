import { Box, Container, ContainerProps, HStack, Stack } from '@chakra-ui/layout'
import { useColorModeValue } from '@chakra-ui/react'
import { useViewportScroll } from 'framer-motion'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { Route } from 'Routes/helpers'
import { Breadcrumbs } from 'components/Breadcrumbs/Breadcrumbs'
import { NestedMenu } from 'components/NestedMenu/NestedMenu'

import { Page } from './Page'

export type MainProps = {
  titleComponent?: ReactNode
  route?: Route
} & ContainerProps

export const Main: React.FC<MainProps> = ({ children, titleComponent, route, ...rest }) => {
  const ref = useRef<HTMLDivElement>(null)
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const [y, setY] = useState(0)
  const { height = 0 } = ref.current?.getBoundingClientRect() ?? {}
  const { scrollY } = useViewportScroll()
  useEffect(() => {
    return scrollY.onChange(() => setY(scrollY.get()))
  }, [scrollY])
  return (
    <>
      <Page>
        {titleComponent && (
          <Box
            width='full'
            transition='box-shadow 0.2s, background-color 0.2s'
            as='header'
            borderBottomWidth={1}
            bg={bg}
            borderColor={borderColor}
            ref={ref}
            top='4.5rem'
            zIndex='sticky'
            shadow={y > height ? 'sm' : undefined}
          >
            <Container maxW='container.xl' pt={4}>
              <Stack>
                <HStack width='full' justifyContent='space-between'>
                  <Breadcrumbs />
                </HStack>
                {titleComponent}
              </Stack>
            </Container>
            {route && <NestedMenu route={route} />}
          </Box>
        )}
        <Container maxW='container.xl' py={8} px={{ base: 0, xl: 4 }} {...rest}>
          {children}
        </Container>
      </Page>
    </>
  )
}
