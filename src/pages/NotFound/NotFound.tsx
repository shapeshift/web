import { Box, Flex, Heading, Text } from '@chakra-ui/layout'
import { Page } from 'components/Layout/Page'

export const NotFound = () => {
  return (
    <Page>
      <Flex minHeight='100vh' alignItems='center' justifyContent='center'>
        <Box maxWidth='300px' textAlign='center'>
          <Heading as='h1'>404</Heading>
          <Text>The page you're looking for cannot be found</Text>
        </Box>
      </Flex>
    </Page>
  )
}
