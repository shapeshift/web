import { ChakraProvider, theme } from '@chakra-ui/react'
import type { RenderOptions } from '@testing-library/react'
import { render } from '@testing-library/react'
import * as React from 'react'

const AllProviders = ({ children }: { children?: React.ReactNode }) => (
  <ChakraProvider theme={theme}>{children}</ChakraProvider>
)

const customRender = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllProviders, ...options })

export { customRender as render }
