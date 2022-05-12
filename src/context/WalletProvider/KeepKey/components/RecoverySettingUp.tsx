import { Flex } from '@chakra-ui/layout'
import { ModalBody, ModalHeader, Spinner } from '@chakra-ui/react'
import { Text } from 'components/Text'

export const RecoverySettingUp = () => {
  return (
    <Flex direction='column' alignItems='center'>
      <Spinner thickness='8px' speed='0.65s' emptyColor='gray.700' size='xxl' />
      <ModalHeader>
        <Text translation={'modals.keepKey.recoverySettingUp.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='gray.500' translation={'modals.keepKey.recoverySettingUp.body'} mb={4} />
      </ModalBody>
    </Flex>
  )
}
