import { ModalBody, ModalHeader } from '@chakra-ui/react'

import { KeepKeyPin } from './Pin'

import { Text } from '@/components/Text'
import { PinMatrixRequestType } from '@/context/WalletProvider/KeepKey/KeepKeyTypes'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const KeepKeyPinModal = () => {
  const {
    state: { keepKeyPinRequestType },
  } = useWallet()

  // Use different translation text based on which type of PIN request we received
  const translationType = (() => {
    switch (keepKeyPinRequestType) {
      case PinMatrixRequestType.NEWFIRST:
        return 'newPin'
      case PinMatrixRequestType.NEWSECOND:
        return 'newPinConfirm'
      default:
        return 'pin'
    }
  })()

  return (
    <>
      <ModalHeader>
        <Text translation={`walletProvider.keepKey.${translationType}.header`} />
      </ModalHeader>
      <ModalBody>
        <KeepKeyPin translationType={translationType} />
      </ModalBody>
    </>
  )
}
