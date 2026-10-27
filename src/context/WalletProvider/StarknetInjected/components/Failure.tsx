import { ModalBody, ModalHeader } from '@chakra-ui/react'

import type { StarknetInjectedKeyManager } from '../config'

import { Text } from '@/components/Text'
import { SUPPORTED_WALLETS } from '@/context/WalletProvider/config'

export const StarknetInjectedFailure = ({
  keyManager,
}: {
  keyManager: StarknetInjectedKeyManager
}) => {
  const { name } = SUPPORTED_WALLETS[keyManager]

  return (
    <>
      <ModalHeader>
        <Text translation={['walletProvider.starknetInjected.failure.header', { name }]} />
      </ModalHeader>
      <ModalBody>
        <Text translation={['walletProvider.starknetInjected.failure.body', { name }]} />
      </ModalBody>
    </>
  )
}
