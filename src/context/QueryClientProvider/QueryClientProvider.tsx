import { QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query'

import { queryClient } from './queryClient'

type QueryClientProviderProps = {
  children: React.ReactNode
}

export const QueryClientProvider = ({ children }: QueryClientProviderProps) => (
  <TanStackQueryClientProvider client={queryClient}>{children}</TanStackQueryClientProvider>
)
