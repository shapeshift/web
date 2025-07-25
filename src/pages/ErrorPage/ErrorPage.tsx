import { Button, Center, Heading, Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import type { FallbackProps } from 'react-error-boundary'
import { FaSadTear } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { IconCircle } from '@/components/IconCircle'
import { Layout } from '@/components/Layout/Layout'
import { Main } from '@/components/Layout/Main'
import { RawText } from '@/components/Text'

export const ErrorPage: React.FC<FallbackProps> = () => {
  const translate = useTranslate()

  const handleReset = useCallback(() => {
    /**
     * we have pretty complex state management (account and tx fetching) that we don't
     * want to try and recreate here to recover from an error.
     * just reload the page and let the user start over.
     */
    window.location.reload()
  }, [])

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
