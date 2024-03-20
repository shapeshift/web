import type { ContainerProps, FlexProps } from '@chakra-ui/react'
import { Box, Container, HStack, Stack } from '@chakra-ui/react'
import { useScroll } from 'framer-motion'
import type { ReactNode } from 'react'
import { memo, useEffect, useRef, useState } from 'react'
import { Breadcrumbs } from 'components/Breadcrumbs/Breadcrumbs'
import { NestedMenu } from 'components/NestedMenu/NestedMenu'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'

import { Page } from './Page'

const contentPaddingX = { base: 0, xl: 4, '2xl': 8 }

export type MainProps = {
  titleComponent?: ReactNode
  headerComponent?: ReactNode
  hideBreadcrumbs?: boolean
  pageProps?: FlexProps
  isSubPage?: boolean
} & ContainerProps

const containerPaddingX = { base: 4, xl: 16 }

export const Main: React.FC<MainProps> = memo(
  ({
    children,
    titleComponent,
    headerComponent,
    hideBreadcrumbs = false,
    pageProps,
    isSubPage,
    ...rest
  }) => {
    const ref = useRef<HTMLDivElement>(null)
    const { currentRoute } = useBrowserRouter()
    const [y, setY] = useState(0)
    const { height = 0 } = ref.current?.getBoundingClientRect() ?? {}
    const { scrollY } = useScroll()
    useEffect(() => {
      return scrollY.onChange(() => setY(scrollY.get()))
    }, [scrollY])
    return (
      <Page isSubpage={isSubPage} {...pageProps}>
        {titleComponent && (
          <Box
            width='full'
            transition='box-shadow 0.2s, background-color 0.2s'
            as='header'
            borderBottomWidth={1}
            borderColor='border.base'
            bg='background.surface.base'
            ref={ref}
            shadow={y > height ? 'sm' : undefined}
          >
            <>
              <Container maxW='container.4xl' px={containerPaddingX} pt={4}>
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
        <Container maxW='container.4xl' px={contentPaddingX} {...rest}>
          {children}
        </Container>
      </Page>
    )
  },
)
