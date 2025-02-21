import type { ContainerProps, FlexProps } from '@chakra-ui/react'
import { Container } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { memo } from 'react'

import { Page } from './Page'

const contentPaddingX = { base: 0, xl: 4, '2xl': 8 }

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
        <Container maxW='container.4xl' px={contentPaddingX} {...rest}>
          {children}
        </Container>
      </Page>
    )
  },
)
