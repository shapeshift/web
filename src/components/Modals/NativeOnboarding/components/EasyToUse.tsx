import { CheckCircleIcon } from '@chakra-ui/icons'
import { Button, Center, Flex, Image, SimpleGrid } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { useModal } from 'hooks/useModal/useModal'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { store } from 'state/store'

import EasyToUseIcon from '../easy-to-use.svg'

const NativeFeatureList = ['trackBalance', 'sendReceive', 'buyCrypto', 'tradeAssets', 'earnYield']

export const EasyToUse = () => {
  const { close: closeModal } = useModal('nativeOnboard')
  const translate = useTranslate()
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
      closeModal()
      history.push(path)
      store.dispatch(preferences.actions.setWelcomeModal({ show: false }))
    },
    [closeModal, history],
  )
  const handleBuyCryptoClick = useCallback(() => handleClick('/buy-crypto'), [handleClick])
  const handleDashboardClick = useCallback(() => handleClick('/wallet'), [handleClick])
  return (
    <SlideTransition>
      <Flex flexDir='column' gap={6}>
        <Center height='150px'>
          <Image src={EasyToUseIcon} height='100px' width='auto' />
        </Center>
        <Flex flexDir='column' gap={2}>
          <Text fontSize='2xl' fontWeight='bold' translation={translateKey('title')} />
          <Text fontSize='lg' translation={translateKey('subTitle')} />
          {renderFeatures}
        </Flex>
        <Flex flexDir='column' gap={2} mt={2}>
          <Button width='full' colorScheme='blue' onClick={handleBuyCryptoClick}>
            {translate(translateKey('cta'))}
          </Button>
          <Button width='full' variant='ghost' onClick={handleDashboardClick}>
            {translate(translateKey('secondaryCta'))}
          </Button>
        </Flex>
      </Flex>
    </SlideTransition>
  )
}
