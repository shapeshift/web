import { QuestionIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import { Button, CloseButton, Flex, Portal, useColorModeValue } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { Text } from './Text'

import { useBrowserRouter } from '@/hooks/useBrowserRouter/useBrowserRouter'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { store } from '@/state/store'

const flexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', md: 'row' }
const alignItems = { base: 'flex-start', md: 'center' }

export const LookingForEarnBanner = () => {
  const translate = useTranslate()
  const { history } = useBrowserRouter()
  const handleDismiss = useCallback(() => {
    store.dispatch(preferences.actions.setShowLookingForEarnBanner(false))
  }, [])
  const handleClickCta = useCallback(() => {
    handleDismiss()
    history.push('/wallet/earn')
  }, [handleDismiss, history])

  return (
    <Portal>
      <Flex
        width='full'
        gap={3}
        justifyContent='center'
        alignItems='center'
        p={3}
        position='fixed'
        zIndex='banner'
        top={0}
        bg={useColorModeValue('white', 'blue.900')}
        boxShadow='lg'
      >
        <QuestionIcon boxSize={5} color='blue.200' />
        <Flex gap={6} flexDir={flexDir} alignItems={alignItems}>
          <Text translation='lookingForEarnBanner.body'></Text>
          <Button onClick={handleClickCta} colorScheme='blue'>
            {translate('lookingForEarnBanner.cta')}
          </Button>
        </Flex>
        <CloseButton onClick={handleDismiss} />
      </Flex>
    </Portal>
  )
}
