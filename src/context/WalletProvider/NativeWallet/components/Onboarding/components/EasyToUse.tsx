import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, Center, Flex, Image, SimpleGrid } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useWallet } from 'hooks/useWallet/useWallet'

import EasyToUseIcon from '../easy-to-use.svg'

const NativeFeatureList = ['trackBalance', 'sendReceive', 'buyCrypto', 'tradeAssets', 'earnYield']

export const EasyToUse = () => {
  const translate = useTranslate()
  const { dispatch } = useWallet()
  const { history } = useBrowserRouter()
  const translateKey = (key: string) => `walletProvider.shapeShift.onboarding.easyToUse.${key}`
  const renderFeatures = useMemo(() => {
    return (
      <SimpleGrid gridTemplateColumns='1fr 1fr' rowGap={4} mt={2}>
        {NativeFeatureList.map((feature, index) => (
          <Flex
            gap={2}
            flex={1}
            flexBasis='50%'
            alignItems='center'
            gridColumn={NativeFeatureList.length === index + 1 ? '1/span 2' : 'auto'}
          >
            <CheckCircleIcon color='green.500' /> <Text translation={translateKey(feature)}></Text>
          </Flex>
        ))}
      </SimpleGrid>
    )
  }, [])

  const handleClick = useCallback(
    (path: string) => {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
      history.push(path)
    },
    [dispatch, history],
  )
  return (
    <SlideTransition>
      <Flex flexDir='column' px={6} gap={6}>
        <Center height='150px'>
          <Image src={EasyToUseIcon} height='100px' width='auto' />
        </Center>
        <Flex flexDir='column' gap={2}>
          <Text fontSize='2xl' fontWeight='bold' translation={translateKey('title')} />
          <Text fontSize='lg' translation={translateKey('subTitle')} />
          {renderFeatures}
        </Flex>
        <Flex flexDir='column' gap={2} mt={2}>
          <Button width='full' colorScheme='blue' onClick={() => handleClick('/buy-crypto')}>
            {translate(translateKey('cta'))}
          </Button>
          <Button
            width='full'
            variant='ghost'
            colorScheme='blue'
            onClick={() => handleClick('/dashboard')}
          >
            {translate(translateKey('secondaryCta'))}
          </Button>
        </Flex>
      </Flex>
    </SlideTransition>
  )
}
