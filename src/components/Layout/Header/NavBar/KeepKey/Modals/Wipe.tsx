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
import { useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { Text } from 'components/Text'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

export const WipeModal = () => {
  const initRef = useRef<HTMLInputElement | null>(null)
  const finalRef = useRef<HTMLDivElement | null>(null)
  const { keepKeyWallet } = useKeepKey()
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

  const onClose = () => {
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
  }

  const wipeDevice = async () => {
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
  }

  return (
    <Modal
      initialFocusRef={initRef}
      finalFocusRef={finalRef}
      isCentered
      closeOnOverlayClick
      closeOnEsc
      isOpen={isOpen}
      onClose={onClose}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
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
            onChange={e => setWipeConfirmationChecked(e.target.checked)}
            mb={6}
            spacing={3}
            ref={initRef}
            fontWeight='semibold'
          >
            {translate('walletProvider.keepKey.modals.checkboxes.wipeKeepKey')}
          </Checkbox>
          <Button
            onClick={wipeDevice}
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
