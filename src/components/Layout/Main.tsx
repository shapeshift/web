import type { ContainerProps } from '@chakra-ui/react'
import { Box, Container, HStack, Stack, useColorModeValue } from '@chakra-ui/react'
import { useScroll } from 'framer-motion'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Breadcrumbs } from 'components/Breadcrumbs/Breadcrumbs'
import { NestedMenu } from 'components/NestedMenu/NestedMenu'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { Page } from './Page'

export type MainProps = {
  titleComponent?: ReactNode
  headerComponent?: ReactNode
  hideBreadcrumbs?: boolean
} & ContainerProps

export const Main: React.FC<MainProps> = ({
  children,
  titleComponent,
  headerComponent,
  hideBreadcrumbs = false,
  ...rest
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const { currentRoute } = useBrowserRouter()
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const [y, setY] = useState(0)
  const { height = 0 } = ref.current?.getBoundingClientRect() ?? {}
  const { scrollY } = useScroll()
  useEffect(() => {
    return scrollY.onChange(() => setY(scrollY.get()))
  }, [scrollY])
  return (
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
          shadow={y > height ? 'sm' : undefined}
        >
          <>
            <Container maxW='container.4xl' px={{ base: 4, xl: 16 }} pt={4}>
              <Stack>
                {!hideBreadcrumbs && (
                  <HStack width='full' justifyContent='space-between'>
                    <Breadcrumbs />
                  </HStack>
                )}

                {titleComponent}
              </Stack>
            </Container>
            {currentRoute && <NestedMenu route={currentRoute} />}
          </>
        </Box>
      )}
      {headerComponent}
      <Container maxW='container.4xl' py={8} px={{ base: 0, xl: 4, '2xl': 16 }} {...rest}>
        {children}
      </Container>
    </Page>
  )
}
