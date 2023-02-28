import { Button, Container, Flex, Link, Portal, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as NavLink } from 'react-router-dom'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { store } from 'state/store'

import { RawText } from './Text'

export const ConsentBanner: React.FC = () => {
  const translate = useTranslate()
  const handleDimiss = useCallback(() => {
    store.dispatch(preferences.actions.setShowConsentBanner(false))
  }, [])
  return (
    <Portal>
      <Flex
        zIndex='banner'
        bg={useColorModeValue('white', 'blue.900')}
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
          py={6}
          maxWidth='container.xl'
          alignItems={{ base: 'flex-start', md: 'center' }}
          gap={6}
        >
          <RawText flex={1} fontSize='sm' fontWeight='medium' letterSpacing='0.02em'>
            {translate('consentBanner.body.1')}
            {` `}
            <Link color='blue.200' href='https://private.shapeshift.com' isExternal target='_self'>
              {translate('consentBanner.body.2')}
            </Link>
            {` `}
            {translate('consentBanner.body.3')}
            {` `}
            <Link as={NavLink} to='/legal/privacy-policy' color='blue.200'>
              {translate('consentBanner.body.4')}
            </Link>
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
