import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Code,
  IconButton,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Tag,
  useColorModeValue,
  Wrap,
} from '@chakra-ui/react'
import range from 'lodash/range'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaEye } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { LocationState } from './BackupPassphraseCommon'
import { BackupPassphraseRoutes } from './BackupPassphraseCommon'

import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { Revocable, revocable } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import { useModal } from '@/hooks/useModal/useModal'
import { isMobile } from '@/lib/globals'

const arrowBackIcon = <ArrowBackIcon />
const faEyeIcon = <FaEye />

export const BackupPassphraseInfo: React.FC<LocationState> = props => {
  const { revocableWallet } = props
  const translate = useTranslate()
  const [revoker] = useState(new (Revocable(class {}))())
  const navigate = useNavigate()
  const [revealed, setRevealed] = useState<boolean>(false)
  const revealedOnce = useRef<boolean>(false)
  const handleShow = useCallback(() => {
    revealedOnce.current = true
    setRevealed(!revealed)
  }, [revealed])
  const { props: backupNativePassphraseProps, close } = useModal('backupNativePassphrase')
  const preventClose = backupNativePassphraseProps?.preventClose

  const alertColor = useColorModeValue('blue.500', 'blue.200')

  // Revoke on unmount
  useEffect(
    () => () => {
      if (revealedOnce.current) revoker.revoke()
    },
    // Don't add revoker here or problems
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const words = useMemo(() => {
    if (!revocableWallet) return

    try {
      return (
        revocableWallet.getWords()?.map((word: string | undefined, index: number) =>
          revocable(
            <Tag
              p={2}
              flexGrow={4}
              flexBasis='auto'
              justifyContent='flex-start'
              fontSize='md'
              key={index}
              colorScheme='blue'
              overflow='hidden'
            >
              <Code mr={2}>{index + 1}</Code>
              {word}
            </Tag>,
            revoker.addRevoker.bind(revoker),
          ),
        ) ?? null
      )
    } catch (e) {
      console.error(e)
    }

    return null
  }, [revocableWallet, revoker])

  const placeholders = useMemo(() => {
    return range(1, 13).map(i => (
      <Tag
        p={2}
        flexGrow={4}
        flexBasis='auto'
        justifyContent='flex-start'
        fontSize='md'
        colorScheme='blue'
        key={i}
      >
        <Code mr={2}>{i}</Code>
        •••••••
      </Tag>
    ))
  }, [])

  const handleCreateBackupClick = useCallback(
    () => navigate(BackupPassphraseRoutes.Test),
    [navigate],
  )

  const handleBackClick = useCallback(() => {
    if (isMobile) {
      close()
      return
    }
    navigate(-1) // This is the equivalent of history.goBack() in v6
  }, [navigate, close])

  return (
    <Box>
      <IconButton
        variant='ghost'
        icon={arrowBackIcon}
        aria-label={translate('common.back')}
        fontSize='xl'
        size='sm'
        isRound
        onClick={handleBackClick}
      />
      <ModalHeader pt={4}>
        <Text translation={'modals.shapeShift.backupPassphrase.info.title'} />
      </ModalHeader>
      {!preventClose && <ModalCloseButton />}
      <SlideTransition>
        <ModalBody>
          <Text
            color='text.subtle'
            translation={'modals.shapeShift.backupPassphrase.info.description'}
            mb={6}
          />
          <Alert status='info'>
            <AlertIcon />
            <AlertDescription>
              <Text
                color={alertColor}
                translation={'modals.shapeShift.backupPassphrase.info.warning'}
              />
            </AlertDescription>
          </Alert>

          <Wrap mt={12} mb={6}>
            {revealed ? words : placeholders}
          </Wrap>
        </ModalBody>
        <ModalFooter justifyContent='space-between'>
          <Button onClick={handleShow} leftIcon={faEyeIcon}>
            <Text
              translation={`walletProvider.shapeShift.create.${revealed ? 'hide' : 'show'}Words`}
            />
          </Button>
          <Button
            colorScheme='blue'
            size='lg'
            disabled={!(words && revealedOnce.current)}
            onClick={handleCreateBackupClick}
          >
            <Text translation={'walletProvider.shapeShift.create.button'} />
          </Button>
        </ModalFooter>
      </SlideTransition>
    </Box>
  )
}
