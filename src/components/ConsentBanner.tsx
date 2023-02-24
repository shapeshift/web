import { Button, Container, Flex, Link, Portal, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { store } from 'state/store'

import { RawText } from './Text'

export const ConsentBanner: React.FC = () => {
  const translate = useTranslate()
  const handleDimiss = useCallback(() => {
    store.dispatch(preferences.actions.setConsentBanner({ show: false }))
  }, [])
  return (
    <Portal>
      <Flex
        zIndex='banner'
        bg={useColorModeValue('white', 'gray.700')}
        position='fixed'
        bottom={0}
        left={0}
        width='full'
        boxShadow='0 10px 20px #000'
        alignItems='center'
      >
        <Container
          display='flex'
          flexDir={{ base: 'column', md: 'row' }}
          py={4}
          maxWidth='container.xl'
          alignItems={{ base: 'flex-start', md: 'center' }}
          gap={4}
        >
          <RawText flex={1}>
            {translate('consentBanner.body.1')}
            {` `}
            <Link color='blue.200'>{translate('consentBanner.body.2')}</Link>
            {` `}
            {translate('consentBanner.body.3')}
            {` `}
            <Link color='blue.200'>{translate('consentBanner.body.4')}</Link>
            {` `}
            {translate('consentBanner.body.5')}
          </RawText>
          <Button colorScheme='blue' onClick={handleDimiss}>
            {translate('consentBanner.cta')}
          </Button>
        </Container>
      </Flex>
    </Portal>
  )
}
