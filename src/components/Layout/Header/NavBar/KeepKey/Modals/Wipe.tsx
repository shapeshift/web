import { ModalCloseButton } from '@chakra-ui/modal'
import {
  Button,
  Checkbox,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay
} from '@chakra-ui/react'
import React, { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { Text } from 'components/Text'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

export const WipeModal = () => {
  const { keepKeyWallet } = useKeepKey()
  const { disconnect } = useWallet()
  const translate = useTranslate()
  const {
    keepKeyWipe: { close, isOpen }
  } = useModal()
  const {
    state: { awaitingDeviceInteraction }
  } = useWallet()
  const [wipeConfirmationChecked, setWipeConfirmationChecked] = useState(false)

  const onClose = () => {
    keepKeyWallet?.cancel()
    close()
  }

  const wipeDevice = async () => {
    await keepKeyWallet?.wipe()
    disconnect()
    close()
  }

  return (
    <Modal isCentered closeOnOverlayClick closeOnEsc isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <ModalHeader>
          <Text translation={'walletProvider.keepKey.modals.headings.wipeKeepKey'} />
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text
            color='gray.500'
            translation={'walletProvider.keepKey.modals.descriptions.wipeKeepKey'}
            mb={6}
          />
          <Checkbox
            isChecked={wipeConfirmationChecked}
            onChange={e => setWipeConfirmationChecked(e.target.checked)}
            mb={6}
            spacing={3}
            fontWeight='semibold'
          >
            {translate('walletProvider.keepKey.modals.checkboxes.wipeKeepKey')}
          </Checkbox>
          <Button
            onClick={wipeDevice}
            colorScheme='red'
            isFullWidth
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
