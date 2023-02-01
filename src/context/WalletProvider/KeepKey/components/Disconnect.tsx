import { WarningIcon } from '@chakra-ui/icons'
import { Flex, ModalBody, ModalHeader } from '@chakra-ui/react'
import { Text } from 'components/Text'

export const KeepKeyDisconnect = () => {
  return (
    <>
      <ModalHeader textAlign='center'>
        <Flex alignItems='center'>
          <WarningIcon color='yellow.300' mr={3} />
          <Text translation={'modals.keepKey.disconnect.header'} />
        </Flex>
      </ModalHeader>
      <ModalBody>
        <Text translation={'modals.keepKey.disconnect.body'} />
      </ModalBody>
    </>
  )
}
