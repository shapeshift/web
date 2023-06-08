import { Box, Flex, Heading } from '@chakra-ui/react'
import { Page } from 'components/Layout/Page'
import { Text } from 'components/Text/Text'

export const NotFound = () => {
  return (
    <Page>
      <Flex minHeight='100vh' alignItems='center' justifyContent='center'>
        <Box maxWidth='300px' textAlign='center'>
          <Heading as='h1'>404</Heading>
          <Text translation='common.pageNotFound' />
        </Box>
      </Flex>
    </Page>
  )
}
