import { Button, Center, Heading, Stack } from '@chakra-ui/react'
import type { FallbackProps } from 'react-error-boundary'
import { FaSadTear } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { IconCircle } from 'components/IconCircle'
import { Layout } from 'components/Layout/Layout'
import { Main } from 'components/Layout/Main'
import { RawText } from 'components/Text'

export const ErrorPage = ({ resetErrorBoundary }: FallbackProps) => {
  const translate = useTranslate()
  return (
    <Layout display='flex'>
      <Main height='100%' display='flex' width='full'>
        <Center width='full'>
          <Stack justifyContent='center' alignItems='center'>
            <IconCircle fontSize='6xl' boxSize='16' bg='blue.500' color='white'>
              <FaSadTear />
            </IconCircle>
            <Heading lineHeight='shorter' fontSize='6xl'>
              {translate('errorPage.title')}
            </Heading>
            <RawText fontSize='xl'>{translate('errorPage.body')}</RawText>
            <Button colorScheme='blue' onClick={resetErrorBoundary}>
              {translate('errorPage.cta')}
            </Button>
          </Stack>
        </Center>
      </Main>
    </Layout>
  )
}
