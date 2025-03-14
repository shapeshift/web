import type { FlexProps } from '@chakra-ui/react'
import { Center, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'

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
  return (
    <Flex
      flex={1}
      flexDir='column'
      pt={isSubpage ? 0 : 'env(safe-area-inset-top)'}
      pb='var(--mobile-nav-offset)'
      {...rest}
    >
      {error && !loading ? renderError() : loading ? renderLoading() : children}
    </Flex>
  )
}

Page.defaultProps = {
  renderLoading: () => (
    <Center width='full' height='100%'>
      <CircularProgress isIndeterminate />
    </Center>
  ),
  renderError: () => (
    <Center width='full' height='100%'>
      <Text translation='common.noResultsFound' />
    </Center>
  ),
}
