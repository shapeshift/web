import { CheckCircleIcon } from '@chakra-ui/icons'
import { ModalBody } from '@chakra-ui/react'

import { Text } from '@/components/Text'

export const TrezorSuccess = () => {
  return (
    <>
      <ModalBody textAlign='center' pb={8}>
        <CheckCircleIcon color='green.500' boxSize={20} mb={6} />
        <Text
          fontSize='lg'
          fontWeight='bold'
          translation={'walletProvider.trezor.success.header'}
        />
        <Text color='text.subtle' translation={'walletProvider.trezor.success.success'} />
      </ModalBody>
    </>
  )
}
