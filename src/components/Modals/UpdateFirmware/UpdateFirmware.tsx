import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { useEffect } from 'react'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

export const UpdateFirmware = (params: any) => {
  const { updateFirmware } = useModal()
  const { close, isOpen } = updateFirmware

  const handleUpdateFirmware = async () => {
    ipcRenderer.send('@keepkey/update-firmware', {})
  }

  useEffect(() => {
    if (isOpen) {
      handleUpdateFirmware()
    }
  }, [isOpen])

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        close()
      }}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <ModalCloseButton ml='auto' borderRadius='full' position='static' />
        <ModalBody>
          <div>
            <ModalHeader>
              <Text translation='Firmware update required' />
              <Table size='sm'>
                <Thead>
                  <Tr>
                    <Th>Firmware Version</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr>
                    <Td>Current</Td>
                    <Td>Recomended</Td>
                  </Tr>
                </Tbody>
                <Tbody>
                  <Tr>
                    <Td>{`${params?.event?.firmware}`}</Td>
                    <Td>{`${params?.event?.recommendedFirmware}`}</Td>
                  </Tr>
                </Tbody>
              </Table>
              <Text translation='Confirm on device' />
            </ModalHeader>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
