import type { ResponsiveValue } from '@chakra-ui/react'
import { Button, Container, Flex, Link, Portal, useColorModeValue } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Link as NavLink } from 'react-router-dom'

import { Text } from './Text'
import type { TextPropTypes } from './Text/Text'

import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { store } from '@/state/store'

const containerFlexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const containerAlignItems = { base: 'flex-start', md: 'center' }

export const ConsentBanner: React.FC = () => {
  const translate = useTranslate()
  const handleDimiss = useCallback(() => {
    store.dispatch(preferences.actions.setShowConsentBanner(false))
  }, [])
  const consentBannerTranslationComponents: TextPropTypes['components'] = useMemo(
    () => ({
      privateLink: (
        <Link color='blue.200' href='https://private.shapeshift.com' isExternal target='_self'>
          private.shapeshift.com
        </Link>
      ),
      privacyPolicyLink: (
        <Link as={NavLink} to='/legal/privacy-policy' color='blue.200'>
          {translate('common.privacy')}
        </Link>
      ),
    }),
    [translate],
  )
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
          flexDir={containerFlexDir}
          py={6}
          maxWidth='container.xl'
          alignItems={containerAlignItems}
          gap={6}
        >
          <Text
            flex={1}
            fontSize='sm'
            fontWeight='medium'
            letterSpacing='0.02em'
            translation='consentBanner.body'
            components={consentBannerTranslationComponents}
          ></Text>
          <Button colorScheme='blue' onClick={handleDimiss}>
            {translate('consentBanner.cta')}
          </Button>
        </Container>
      </Flex>
    </Portal>
  )
}
