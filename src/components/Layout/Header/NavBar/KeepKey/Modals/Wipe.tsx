import {
  Button,
  Checkbox,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useToast,
} from '@chakra-ui/react'
import React, { useCallback, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { AwaitKeepKey } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { Text } from '@/components/Text'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { useKeepKey } from '@/context/WalletProvider/KeepKeyProvider'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const WipeModal = () => {
  const initRef = useRef<HTMLInputElement | null>(null)
  const finalRef = useRef<HTMLDivElement | null>(null)
  const {
    state: { keepKeyWallet },
  } = useKeepKey()
  const { disconnect } = useWallet()
  const translate = useTranslate()
  const { close, isOpen } = useModal('keepKeyWipe')
  const {
    state: {
      deviceState: { awaitingDeviceInteraction },
    },
  } = useWallet()
  const toast = useToast()
  const [wipeConfirmationChecked, setWipeConfirmationChecked] = useState(false)
  const { modalStyle, overlayStyle, isHighestModal } = useModalRegistration({
    isOpen,
    modalId: 'keep-key-wipe-modal',
  })

  const handleClose = useCallback(() => {
    keepKeyWallet?.cancel().catch(e => {
      console.error(e)
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
    close()
  }, [close, keepKeyWallet, toast, translate])

  const handleWipeDeviceClick = useCallback(async () => {
    try {
      await keepKeyWallet?.wipe()
      disconnect()
      close()
    } catch (e) {
      console.error(e)
      toast({
        title: translate('common.error'),
        description: (e as { message: string })?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    }
  }, [close, disconnect, keepKeyWallet, toast, translate])

  const handleWipeChecked = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setWipeConfirmationChecked(e.target.checked),
    [],
  )

  return (
    <Modal
      initialFocusRef={initRef}
      finalFocusRef={finalRef}
      isCentered
      closeOnOverlayClick
      closeOnEsc
      isOpen={isOpen}
      onClose={handleClose}
      trapFocus={isHighestModal}
      blockScrollOnMount={isHighestModal}
    >
      <ModalOverlay {...overlayStyle} />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6} containerProps={modalStyle}>
        <ModalHeader>
          <Text translation={'walletProvider.keepKey.modals.headings.wipeKeepKey'} />
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text
            color='text.subtle'
            translation={'walletProvider.keepKey.modals.descriptions.wipeKeepKey'}
            mb={6}
          />
          <Checkbox
            isChecked={wipeConfirmationChecked}
            onChange={handleWipeChecked}
            mb={6}
            spacing={3}
            ref={initRef}
            fontWeight='semibold'
          >
            {translate('walletProvider.keepKey.modals.checkboxes.wipeKeepKey')}
          </Checkbox>
          <Button
            onClick={handleWipeDeviceClick}
            colorScheme='red'
            width='full'
            mb={6}
            isLoading={awaitingDeviceInteraction}
            disabled={!wipeConfirmationChecked}
          >
            {translate('walletProvider.keepKey.modals.actions.wipeDevice')}
          </Button>
        </ModalBody>
        <AwaitKeepKey
          translation={'walletProvider.keepKey.modals.confirmations.wipeKeepKey'}
          pl={6}
          pr={6}
        />
      </ModalContent>
    </Modal>
  )
}
