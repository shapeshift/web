import { ModalBody, ModalHeader } from '@chakra-ui/react'

import { Text } from '@/components/Text'

export const SeekerFailure = () => {
  return (
    <>
      <ModalHeader>
        <Text translation='walletProvider.seeker.failure.header' />
      </ModalHeader>
      <ModalBody>
        <Text translation='walletProvider.seeker.failure.body' />
      </ModalBody>
    </>
  )
}
