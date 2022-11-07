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
  const { updateKeepKey } = useModal()
  const { close, isOpen } = updateKeepKey

  const handleUpdateFirmware = async () => {
    ipcRenderer.send('@keepkey/update-firmware', {})
  }

  useEffect(() => {
    if (isOpen) {
      handleUpdateFirmware()
    }
  }, [isOpen])

  return (
    <ModalBody pt={5}>
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
            <Td>Recommended</Td>
          </Tr>
        </Tbody>
        <Tbody>
          <Tr>
            <Td>{params?.event?.firmware}</Td>
            <Td>{params?.event?.recommendedFirmware}</Td>
          </Tr>
        </Tbody>
      </Table>
      <br />
      <Text size='xl'  translation='Confirm on device' />
    </ModalBody>
  )
}
