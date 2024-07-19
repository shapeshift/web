import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { AssetOnLedger } from 'components/LedgerOpenApp/components/AssetOnLedger'
import { useLedgerAppDetails } from 'components/LedgerOpenApp/hooks/useLedgerAppDetails'
import { RawText, Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

export type OpenLedgerAppModalProps = {
  chainId: ChainId
  onCancel: () => void
}

export const OpenLedgerAppModal = ({ chainId, onCancel }: OpenLedgerAppModalProps) => {
  const { close: closeModal, isOpen } = useModal('openLedgerApp')
  const translate = useTranslate()

  const { appName, appAsset } = useLedgerAppDetails(chainId)

  const handleClose = useCallback(() => {
    closeModal()
    onCancel()
  }, [closeModal, onCancel])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size='md' closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign='left' pt={14}>
          <VStack spacing={2} width='full'>
            {appAsset ? <AssetOnLedger assetId={appAsset.assetId} size='lg' /> : null}
            <RawText as='h3' fontWeight='semibold'>
              {translate('accountManagement.ledgerOpenApp.title', {
                appName,
              })}
            </RawText>
          </VStack>
        </ModalHeader>
        <ModalBody>
          <VStack spacing={2}>
            <Text
              translation={'accountManagement.ledgerOpenApp.description'}
              color={'whiteAlpha.600'}
            />
            <Spinner size='lg' />
          </VStack>
        </ModalBody>
        <ModalFooter justifyContent='center' pb={6}>
          <VStack spacing={2} width='full'>
            <Button size='lg' colorScheme='gray' onClick={handleClose} width='full'>
              {translate('common.cancel')}
            </Button>
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
