import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Code,
  IconButton,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  ModalHeader,
  Tag,
  useColorModeValue,
  useUnmountEffect,
  Wrap,
} from '@chakra-ui/react'
import range from 'lodash/range'
import React, { useMemo, useRef, useState } from 'react'
import { FaEye } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { Revocable, revocable } from 'context/WalletProvider/MobileWallet/RevocableWallet'
import { useModal } from 'hooks/useModal/useModal'

import type { LocationState } from './BackupPassphraseCommon'
import { BackupPassphraseRoutes } from './BackupPassphraseCommon'

export const BackupPassphraseInfo: React.FC<LocationState> = props => {
  const { revocableWallet } = props
  const translate = useTranslate()
  const [revoker] = useState(new (Revocable(class {}))())
  const { goBack: handleBackClick, ...history } = useHistory()
  const [revealed, setRevealed] = useState<boolean>(false)
  const revealedOnce = useRef<boolean>(false)
  const handleShow = () => {
    revealedOnce.current = true
    setRevealed(!revealed)
  }
  const { props: backupNativePassphraseProps } = useModal('backupNativePassphrase')
  const preventClose = backupNativePassphraseProps?.preventClose

  const alertColor = useColorModeValue('blue.500', 'blue.200')

  useUnmountEffect(() => {
    if (revealedOnce.current) revoker.revoke()
  }, [revoker])

  const words = useMemo(() => {
    if (!revocableWallet) return

    try {
      return (
        revocableWallet.getWords()?.map((word: string, index: number) =>
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

  return (
    <SlideTransition>
      <IconButton
        variant='ghost'
        icon={<ArrowBackIcon />}
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
        <Button onClick={handleShow} leftIcon={<FaEye />}>
          <Text
            translation={`walletProvider.shapeShift.create.${revealed ? 'hide' : 'show'}Words`}
          />
        </Button>
        <Button
          colorScheme='blue'
          size='lg'
          disabled={!(words && revealedOnce.current)}
          onClick={() => history.push(BackupPassphraseRoutes.Test)}
        >
          <Text translation={'walletProvider.shapeShift.create.button'} />
        </Button>
      </ModalFooter>
    </SlideTransition>
  )
}
