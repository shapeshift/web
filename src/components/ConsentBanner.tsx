import { Button, Container, Flex, Link } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { RawText } from './Text'

export const ConsentBanner: React.FC = () => {
  const translate = useTranslate()
  return (
    <Flex
      zIndex='banner'
      bg='gray.700'
      position='fixed'
      bottom={0}
      left={0}
      width='full'
      boxShadow='sm'
      alignItems='center'
    >
      <Container display='flex' flexDir='column' py={4} maxWidth='container.xl' gap={4}>
        <RawText>
          {translate('consentBanner.body.1')}
          {` `}
          <Link color='blue.200'>{translate('consentBanner.body.2')}</Link>
          {` `}
          {translate('consentBanner.body.3')}
          {` `}
          <Link color='blue.200'>{translate('consentBanner.body.4')}</Link>
        </RawText>
        <Button maxWidth='md' width='full' colorScheme='blue'>
          Got It
        </Button>
      </Container>
    </Flex>
  )
}
