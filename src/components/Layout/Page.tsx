import type { FlexProps } from '@chakra-ui/react'
import { Center, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import { Text } from '@/components/Text'
import type { Route } from '@/Routes/helpers'

type PageProps = {
  children: ReactNode
  loading?: boolean
  error?: boolean
  renderError?: () => ReactNode
  renderLoading?: () => ReactNode
  route?: Route
  isSubpage?: boolean
} & FlexProps

export const Page: React.FC<PageProps> = ({
  children,
  loading,
  error,
  renderLoading = () => null,
  renderError = () => null,
  route,
  isSubpage,
  ...rest
}: PageProps) => {
  const content = useMemo(() => {
    if (loading)
      return (
        <Center width='full' height='100%'>
          <CircularProgress isIndeterminate />
        </Center>
      )
    if (error)
      return (
        <Center width='full' height='100%'>
          <Text translation='common.noResultsFound' />
        </Center>
      )

    return children
  }, [children, error, loading, renderError, renderLoading])

  return (
    <Flex
      flex={1}
      flexDir='column'
      pt={isSubpage ? 0 : 'env(safe-area-inset-top)'}
      pb='var(--mobile-nav-offset)'
      {...rest}
    >
      {content}
    </Flex>
  )
}
