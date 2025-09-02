import type { ContainerProps, FlexProps } from '@chakra-ui/react'
import { Container } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { memo } from 'react'

import { Page } from './Page'

const contentPaddingX = { base: 4, md: 6, xl: 8, '2xl': 12 }

export type MainProps = {
  headerComponent?: ReactNode
  pageProps?: FlexProps
  isSubPage?: boolean
} & ContainerProps

export const Main: React.FC<MainProps> = memo(
  ({ children, headerComponent, pageProps, isSubPage, ...rest }) => {
    return (
      <Page isSubpage={isSubPage} {...pageProps}>
        {headerComponent}
        <Container maxW='container.4xl' px={contentPaddingX} mx='auto' {...rest}>
          {children}
        </Container>
      </Page>
    )
  },
)
