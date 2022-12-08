import { Button, Center, Heading, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import type { FallbackProps } from 'react-error-boundary'
import { FaSadTear } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { IconCircle } from 'components/IconCircle'
import { Layout } from 'components/Layout/Layout'
import { Main } from 'components/Layout/Main'
import { RawText } from 'components/Text'
import { logger } from 'lib/logger'
import { persistor } from 'state/store'

const moduleLogger = logger.child({ namespace: ['ErrorBoundary'] })

export const ErrorPage: React.FC<FallbackProps> = ({ resetErrorBoundary }) => {
  const translate = useTranslate()

  const handleReset = useCallback(async () => {
    try {
      /**
       * we've hit the error boundary - not good. it's possibly related to stale data
       * in the redux store. purge the store and reset the error boundary.
       */
      await persistor.purge()
    } catch (e) {
      moduleLogger.error(e, 'Error purging redux persistence')
    }
    resetErrorBoundary()
  }, [resetErrorBoundary])

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
            <Button colorScheme='blue' onClick={handleReset}>
              {translate('errorPage.cta')}
            </Button>
          </Stack>
        </Center>
      </Main>
    </Layout>
  )
}
