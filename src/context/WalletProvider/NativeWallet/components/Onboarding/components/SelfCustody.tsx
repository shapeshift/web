import { Center, Flex, Image, Link, useColorModeValue } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'

import SelfCustodyIcon from '../self-custody.svg'

export const SelfCustody = () => {
  const translate = useTranslate()
  const linkColor = useColorModeValue('blue.500', 'blue.200')
  const translateKey = (key: string) => `walletProvider.shapeShift.onboarding.selfCustody.${key}`
  return (
    <SlideTransition>
      <Flex flexDir='column' px={6} gap={4}>
        <Center height='150px'>
          <Image src={SelfCustodyIcon} height='100px' width='auto' />
        </Center>
        <Flex flexDir='column' gap={2}>
          <Text fontSize='2xl' fontWeight='bold' translation={translateKey('title')} />
          <Text fontSize='lg' translation={translateKey('subTitle')} />
          <RawText color='gray.500'>
            {translate(translateKey('body.1'))}{' '}
            <Link color={linkColor} isExternal href='https://google.com'>
              {translate(translateKey('body.2'))}
            </Link>{' '}
            {translate(translateKey('body.3'))}
          </RawText>
        </Flex>
      </Flex>
    </SlideTransition>
  )
}
