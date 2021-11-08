import { CheckCircleIcon } from '@chakra-ui/icons'
import { ModalBody } from '@chakra-ui/react'

import { Text } from '../../../../components/Text'

export const KeepKeySuccess = () => {
  const isSuccessful = true

  return (
    <>
      <ModalBody textAlign='center' pb={8}>
        <CheckCircleIcon color='green.500' boxSize={20} mb={6} />
        <Text
          fontSize='lg'
          fontWeight='bold'
          translation={'walletProvider.shapeShift.nativeSuccess.header'}
        />
        {isSuccessful && (
          <Text color='gray.500' translation={'walletProvider.shapeShift.nativeSuccess.success'} />
        )}
      </ModalBody>
    </>
  )
}
