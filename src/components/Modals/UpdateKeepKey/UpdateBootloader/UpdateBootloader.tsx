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

export const UpdateBootloader = (params: any) => {
  const { updateKeepKey } = useModal()
  const { close, isOpen } = updateKeepKey

  const handleUpdateBootloader = async () => {
    ipcRenderer.send('@keepkey/update-bootloader', {})
  }
  useEffect(() => {
    if (isOpen) {
      handleUpdateBootloader()
    }
  }, [isOpen])

  return (
    <>
      <Table size='sm'>
        <Thead>
          <Tr>
            <Th>Bootloader Version</Th>
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
            <Td>{`${params?.event?.bootloader}`}</Td>
            <Td>{`${params?.event?.recommendedBootloader}`}</Td>
          </Tr>
        </Tbody>
      </Table>
      <br />
      <Text translation='Click on device' />
    </>
  )
}
