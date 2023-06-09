import type { FlexProps } from '@chakra-ui/react'
import { Center, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import type { Route } from 'Routes/helpers'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Text } from 'components/Text'

type PageProps = {
  children: ReactNode
  loading?: boolean
  error?: boolean
  renderError?: () => ReactNode
  renderLoading?: () => ReactNode
  route?: Route
} & FlexProps

export const Page: React.FC<PageProps> = ({
  children,
  loading,
  error,
  renderLoading = () => null,
  renderError = () => null,
  route,
  ...rest
}: PageProps) => {
  return (
    <Flex flex={1} flexDir='column' height='calc(100% - 72px)' {...rest}>
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
