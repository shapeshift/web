import { ModalCloseButton } from '@chakra-ui/modal'
import { Button, Modal, ModalBody, ModalContent, ModalHeader, ModalOverlay } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
// import { useWallet } from 'hooks/useWallet/useWallet'
// import { logger } from 'lib/logger'

// const moduleLogger = logger.child({
//   namespace: ['Layout', 'Header', 'NavBar', 'Native', 'BackupNativePassphrase'],
// })

export const BackupNativePassphraseModal = () => {
  const translate = useTranslate()
  const {
    backupNativePassphrase: { close, isOpen },
  } = useModal()
  // const {
  //   state: {},
  // } = useWallet()

  return (
    <Modal isCentered closeOnOverlayClick closeOnEsc isOpen={isOpen} onClose={close}>
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
          <Button colorScheme='red' width='full' mb={6}>
            {translate('walletProvider.keepKey.modals.actions.wipeDevice')}
          </Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
