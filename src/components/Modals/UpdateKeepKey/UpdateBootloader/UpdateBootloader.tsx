import { ModalBody, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { useEffect } from 'react'
import { Text } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'

export const UpdateBootloader = (params: any) => {
  const { updateKeepKey } = useModal()
  const { isOpen } = updateKeepKey

  const handleUpdateBootloader = async () => {
    ipcRenderer.send('@keepkey/update-bootloader', {})
  }
  useEffect(() => {
    if (isOpen) {
      handleUpdateBootloader()
    }
  }, [isOpen])

  return (
    <ModalBody pt={5}>
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
            <Td>Recommended</Td>
          </Tr>
        </Tbody>
        <Tbody>
          <Tr>
            <Td>{params?.event?.bootloader}</Td>
            <Td>{params?.event?.recommendedBootloader}</Td>
          </Tr>
        </Tbody>
      </Table>
      <br />
      <Text size='lg' translation='Confirm on device' />
    </ModalBody>
  )
}
