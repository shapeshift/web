import {
  Box,
  Button,
  Flex,
  Icon,
  SimpleGrid,
  Text as CText,
  useClipboard,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { Default } from '@shapeshiftoss/hdwallet-native/dist/crypto/isolation/engines'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiCopy } from 'react-icons/fi'
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

const copyIcon = <Icon as={FiCopy} />

const Revocable = Default.Revocable
const revocable = Default.revocable

type ManualBackupProps = {
  showContinueButton?: boolean
}

export const ManualBackup = ({ showContinueButton = true }: ManualBackupProps) => {
  const history = useHistory()
  const location = useLocation<MobileLocationState>()
  const translate = useTranslate()
  const bgColor = useColorModeValue('blue.500', 'blue.500')
  const [revoker] = useState(new (Revocable(class {}))())
  const revokedRef = useRef(false)

  const handleBack = useCallback(() => {
    if (showContinueButton) {
      history.push(MobileWalletDialogRoutes.KeepSafe, { vault: location.state?.vault })
      return
    }

    history.push(MobileWalletDialogRoutes.Saved)
  }, [history, location.state?.vault, showContinueButton])

  const handleContinue = useCallback(() => {
    history.push(MobileWalletDialogRoutes.CreateBackupConfirm, { vault: location.state?.vault })
  }, [history, location.state?.vault])

  const words = useMemo(() => {
    if (!location.state?.vault) return []
    return location.state.vault.getWords() ?? []
  }, [location.state?.vault])

  const { onCopy, hasCopied } = useClipboard(!revokedRef.current ? words.join(' ') : '')

  const wordsButtonList = useMemo(() => {
    if (revokedRef.current) return null

    return words.map((word, index) =>
      revocable(
        <Box key={index} display='flex' alignItems='center' width='full'>
          <CText color='white' opacity={0.6} mr={2} flexShrink={0}>
            {index + 1}
          </CText>
          <CText
            color='white'
            fontWeight='medium'
            borderBottom='1px solid'
            borderColor='text.subtle'
            width='full'
          >
            {word}
          </CText>
        </Box>,
        revoker.addRevoker.bind(revoker),
      ),
    )
  }, [words, revoker])

  useEffect(() => {
    revokedRef.current = false

    return () => {
      revokedRef.current = true
      if (!revokedRef.current) {
        setTimeout(() => revoker.revoke(), 250)
      }
    }
  }, [revoker])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={handleBack} />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>
          {showContinueButton ? (
            <Box minWidth='50px'>
              <CarouselDots length={4} activeIndex={3} />
            </Box>
          ) : null}
        </DialogHeaderMiddle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <DialogBody>
        <VStack spacing={6} mb={6} alignItems='flex-start'>
          <Box>
            <CText fontSize='2xl' fontWeight='bold'>
              {translate('walletProvider.manualBackup.header')}
            </CText>
            <CText color='text.subtle'>{translate('walletProvider.manualBackup.subHeader')}</CText>
          </Box>

          <Box bg={bgColor} borderRadius='xl' p={4} width='full'>
            <SimpleGrid columns={2} spacing={2}>
              {wordsButtonList}
            </SimpleGrid>
          </Box>

          <Flex width='100%' alignItems='center' gap={4}>
            <Box flex={1} height='1px' backgroundColor='text.subtle' />
            <Button
              variant='ghost'
              onClick={onCopy}
              leftIcon={copyIcon}
              color='text.subtle'
              flexShrink={0}
            >
              {hasCopied
                ? translate('walletProvider.manualBackup.copied')
                : translate('walletProvider.manualBackup.copyToClipboard')}
            </Button>
            <Box flex={1} height='1px' backgroundColor='text.subtle' />
          </Flex>

          {showContinueButton ? (
            <VStack spacing={2} alignItems='center'>
              <Icon as={IoShieldCheckmark} boxSize='20px' color='text.subtle' />
              <CText color='text.subtle' textAlign='center' fontSize='14px'>
                {translate('walletProvider.manualBackup.nextStep')}
              </CText>
            </VStack>
          ) : null}
        </VStack>
      </DialogBody>
      <DialogFooter>
        {showContinueButton ? (
          <Button colorScheme='blue' size='lg' width='full' onClick={handleContinue}>
            {translate('walletProvider.manualBackup.button')}
          </Button>
        ) : null}
      </DialogFooter>
    </SlideTransition>
  )
}
