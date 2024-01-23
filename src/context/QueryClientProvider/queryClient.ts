import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // default: true
      // This will ensure the cache is used if available (the query hasn't gone stale, and the cache isn't expired)
      refetchOnMount: false, // default: true
      // We will most likely want this as a default but would need to audit all usages to ensure this isn't going to be a rug anywhere
      // staleTime: Infinity, // default: 0
    },
  },
})
