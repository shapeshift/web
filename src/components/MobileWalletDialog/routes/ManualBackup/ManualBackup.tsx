import {
  Box,
  Button,
  Flex,
  Icon,
  SimpleGrid,
  Text as CText,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { crypto } from '@shapeshiftoss/hdwallet-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiCopy } from 'react-icons/fi'
import { IoShieldCheckmark } from 'react-icons/io5'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { MobileWalletDialogRoutes } from '../../types'

import { CarouselDots } from '@/components/CarouselDots/CarouselDots'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'

const copyIcon = <Icon as={FiCopy} />

const Revocable = crypto.Isolation.Engines.Default.Revocable
const revocable = crypto.Isolation.Engines.Default.revocable

type ManualBackupProps = {
  showContinueButton?: boolean
}

export const ManualBackup = ({ showContinueButton = true }: ManualBackupProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const translate = useTranslate()
  const bgColor = useColorModeValue('blue.500', 'blue.500')
  const [revoker] = useState(new (Revocable(class {}))())
  const revokedRef = useRef(false)

  const handleBack = useCallback(() => {
    if (showContinueButton) {
      navigate(MobileWalletDialogRoutes.KeepSafe, {
        state: { vault: location.state?.vault },
      })
      return
    }

    navigate(MobileWalletDialogRoutes.Saved)
  }, [navigate, location.state?.vault, showContinueButton])

  const handleContinue = useCallback(() => {
    navigate(MobileWalletDialogRoutes.CreateBackupConfirm, {
      state: { vault: location.state?.vault },
    })
  }, [navigate, location.state?.vault])

  const words = useMemo(() => {
    if (!location.state?.vault) return []
    return location.state.vault.getWords() ?? []
  }, [location.state?.vault])

  const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 })

  const handleCopyClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      copyToClipboard(!revokedRef.current ? words.join(' ') : '')
    },
    [copyToClipboard, words, revokedRef],
  )

  const wordsButtonList = useMemo(() => {
    if (revokedRef.current) return null

    return words.map((word: string, index: number) =>
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
              onClick={handleCopyClick}
              leftIcon={copyIcon}
              color='text.subtle'
              flexShrink={0}
            >
              {isCopied
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
