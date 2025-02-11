import { Box, Button, Icon, Text as CText, useColorModeValue, VStack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { FaLock } from 'react-icons/fa'
import { FiAlertTriangle, FiEye } from 'react-icons/fi'
import { IoShieldCheckmark } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { CarouselDots } from 'components/CarouselDots/CarouselDots'
import { DialogBackButton } from 'components/Modal/components/DialogBackButton'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogCloseButton } from 'components/Modal/components/DialogCloseButton'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from 'components/Modal/components/DialogHeader'
import { SlideTransition } from 'components/SlideTransition'
import type { MobileLocationState } from 'context/WalletProvider/MobileWallet/types'

import { MobileWalletDialogRoutes } from '../../types'

export const KeepSafe = () => {
  const location = useLocation<MobileLocationState>()
  const history = useHistory()
  const translate = useTranslate()
  const bgColor = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')

  const handleBack = useCallback(() => {
    history.push(MobileWalletDialogRoutes.Create, { vault: location.state?.vault })
  }, [history, location.state?.vault])

  const handleContinue = useCallback(() => {
    history.push(MobileWalletDialogRoutes.CreateBackup, { vault: location.state?.vault })
  }, [history, location.state?.vault])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={handleBack} />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>
          <Box minWidth='50px'>
            <CarouselDots length={4} activeIndex={2} />
          </Box>
        </DialogHeaderMiddle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <VStack spacing={6} alignItems='flex-start' mb={6}>
          <Icon as={FaLock} boxSize='34px' color='blue.500' />
          <Box mb={6}>
            <CText fontSize='2xl' fontWeight='bold' mb={2}>
              {translate('walletProvider.keepSafe.headerStart')}
              <CText
                as='span'
                color='blue.500'
                background='linear-gradient(97.53deg, #F687B3 5.6%, #7B61FF 59.16%, #16D1A1 119.34%)'
                backgroundClip='text'
                mx={1}
              >
                {translate('walletProvider.keepSafe.headerSecret')}
              </CText>
              {translate('walletProvider.keepSafe.headerEnd')}
            </CText>
            <CText color='text.subtle' mb={4}>
              {translate('walletProvider.keepSafe.subHeader')}
            </CText>
            <CText color='text.subtle'>{translate('walletProvider.keepSafe.description')}</CText>
          </Box>
          <VStack spacing={4} width='full' bg={bgColor} borderRadius='xl' p={4}>
            <Box display='flex' alignItems='center' width='full' gap={3}>
              <Icon as={IoShieldCheckmark} boxSize='24px' color='text.subtle' />
              <CText fontSize='14px'>
                {`${translate('walletProvider.keepSafe.headerStart')} ${translate(
                  'walletProvider.keepSafe.headerSecret',
                )} ${translate('walletProvider.keepSafe.headerEnd')}`}
              </CText>
            </Box>
            <Box display='flex' alignItems='center' width='full' gap={3}>
              <Icon as={FiEye} boxSize='24px' color='text.subtle' />
              <CText fontSize='14px'>
                {translate('walletProvider.keepSafe.bulletPoints.share')}
              </CText>
            </Box>
            <Box display='flex' alignItems='center' width='full' gap={3} color='orange.500'>
              <Icon as={FiAlertTriangle} boxSize='24px' />
              <CText fontSize='14px'>
                {translate('walletProvider.keepSafe.bulletPoints.lose')}
              </CText>
            </Box>
          </VStack>
        </VStack>
      </DialogBody>
      <DialogFooter>
        <Button colorScheme='blue' size='lg' width='full' onClick={handleContinue}>
          {translate('walletProvider.keepSafe.button')}
        </Button>
      </DialogFooter>
    </SlideTransition>
  )
}
