import { Modal, ModalCloseButton, ModalContent, ModalOverlay } from '@chakra-ui/react'

import { useModalRegistration } from '@/context/ModalStackProvider'
import { NativeMultichainContent } from '@/context/WalletProvider/MetaMask/components/NativeMultichainContent'
import { useNativeMultichainChoice } from '@/context/WalletProvider/MetaMask/hooks/useNativeMultichainChoice'
import { useModal } from '@/hooks/useModal/useModal'

export type NativeMultichainModalProps = Record<string, never>

export const NativeMultichainModal: React.FC<NativeMultichainModalProps> = () => {
  const { close, isOpen } = useModal('nativeMultichain')

  const { modalProps, overlayProps, modalContentProps } = useModalRegistration({
    isOpen,
    onClose: close,
  })

  const { hasSnap, chainAssets, handleUseNative, handleKeepSnap, isKeepSnapLoading } =
    useNativeMultichainChoice({
      onDismiss: close,
    })

  return (
    <Modal {...modalProps} isCentered size='sm'>
      <ModalOverlay {...overlayProps} />
      <ModalContent {...modalContentProps} minW='450px'>
        <ModalCloseButton />
        <NativeMultichainContent
          hasSnap={hasSnap}
          chainAssets={chainAssets}
          onUseNative={handleUseNative}
          onKeepSnap={handleKeepSnap}
          isKeepSnapLoading={isKeepSnapLoading}
        />
      </ModalContent>
    </Modal>
  )
}
