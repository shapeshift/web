import { Button, Center, Heading, Stack } from '@chakra-ui/react'
import { FallbackProps } from 'react-error-boundary'
import { FaSadTear } from 'react-icons/fa'
import { IconCircle } from 'components/IconCircle'
import { Layout } from 'components/Layout/Layout'
import { Main } from 'components/Layout/Main'
import { RawText } from 'components/Text'

export const ErrorPage = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <Layout display='flex'>
      <Main height='100%' display='flex' width='full'>
        <Center width='full'>
          <Stack justifyContent='center' alignItems='center'>
            <IconCircle fontSize='6xl' boxSize='16' bg='blue.500' color='white'>
              <FaSadTear />
            </IconCircle>
            <Heading lineHeight='shorter' fontSize='6xl'>
              Oops!
            </Heading>
            <RawText fontSize='xl'>Something went wrong</RawText>
            <pre>{error.message}</pre>
            <Button colorScheme='blue' onClick={resetErrorBoundary}>
              Try again
            </Button>
          </Stack>
        </Center>
      </Main>
    </Layout>
  )
}
