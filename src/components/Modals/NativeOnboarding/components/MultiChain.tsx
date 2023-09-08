import { Center, Flex, Image } from '@chakra-ui/react'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import MultiChainIcon from '../multi-chain.svg'

export const MultiChain = () => {
  const translateKey = (key: string) => `walletProvider.shapeShift.onboarding.multiChain.${key}`
  return (
    <SlideTransition>
      <Flex flexDir='column' gap={4}>
        <Center height='150px'>
          <Image src={MultiChainIcon} height='100px' width='auto' />
        </Center>
        <Flex flexDir='column' gap={2}>
          <Text fontSize='2xl' fontWeight='bold' translation={translateKey('title')} />
          <Text fontSize='lg' translation={translateKey('subTitle')} />
          <Text color='text.subtle' translation={translateKey('body')} />
        </Flex>
      </Flex>
    </SlideTransition>
  )
}
