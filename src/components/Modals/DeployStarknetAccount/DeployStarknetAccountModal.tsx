import {
  Alert,
  AlertDescription,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  VStack,
} from '@chakra-ui/react'
import { starknetAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { AssetIcon } from '@/components/AssetIcon'
import { RawText } from '@/components/Text'
import { useModalRegistration } from '@/context/ModalStackProvider'
import { useModal } from '@/hooks/useModal/useModal'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export type DeployStarknetAccountModalProps = {
  onConfirm: () => void
  onCancel: () => void
}

export const DeployStarknetAccountModal = ({
  onConfirm,
  onCancel,
}: DeployStarknetAccountModalProps) => {
  const translate = useTranslate()
  const starknetAsset = useAppSelector(state => selectAssetById(state, starknetAssetId))
  const { close: closeModal, isOpen } = useModal('deployStarknetAccount')

  const handleConfirm = useCallback(() => {
    closeModal()
    onConfirm()
  }, [closeModal, onConfirm])

  const handleCancel = useCallback(() => {
    closeModal()
    onCancel()
  }, [closeModal, onCancel])

  const { modalProps, overlayProps, modalContentProps } = useModalRegistration({
    isOpen,
    onClose: handleCancel,
  })

  return (
    <Modal {...modalProps} isCentered size='md' closeOnOverlayClick={false}>
      <ModalOverlay {...overlayProps} />
      <ModalContent {...modalContentProps}>
        <ModalHeader textAlign='center' pt={14}>
          <VStack spacing={4} width='full'>
            {starknetAsset && <AssetIcon assetId={starknetAsset.assetId} size='lg' />}
            <RawText as='h3' fontWeight='semibold'>
              {translate('starknet.deployAccount.title')}
            </RawText>
          </VStack>
        </ModalHeader>
        <ModalBody>
          <VStack spacing={4}>
            <RawText color='text.subtle' textAlign='center'>
              {translate('starknet.deployAccount.description')}
            </RawText>
            <Alert status='info'>
              <AlertDescription>{translate('starknet.deployAccount.explanation')}</AlertDescription>
            </Alert>
          </VStack>
        </ModalBody>
        <ModalFooter flexDir='column' gap={2} pb={6}>
          <Button size='lg' colorScheme='blue' onClick={handleConfirm} width='full'>
            {translate('starknet.deployAccount.deployButton')}
          </Button>
          <Button size='lg' variant='ghost' onClick={handleCancel} width='full'>
            {translate('common.cancel')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
