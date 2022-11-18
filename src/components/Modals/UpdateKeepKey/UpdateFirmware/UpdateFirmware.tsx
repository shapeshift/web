import { Button, ModalBody, Table, Tbody, Td, Th, Thead, Tr } from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { useEffect } from 'react'
import { useModal } from 'hooks/useModal/useModal'


export const UpdateFirmware = (params: any) => {
  const { updateKeepKey, requestBootloaderMode } = useModal()
  const { isOpen } = updateKeepKey

  const onAcceptUpdate = async () => {
    console.log("onAcceptUpdate: ")
    ipcRenderer.send('@keepkey/update-firmware', {})
  }

  // const onSkipUpdate = async () => {
  //   console.log("onSkipUpdate: ")
  //   ipcRenderer.send('onCompleteFirmwareUpload',{})
  // }

  useEffect(() => {
    if (isOpen) {
      console.log("isOpen: ")
      ipcRenderer.send('@keepkey/update-firmware', {})
    }
  }, [isOpen])

  useEffect(() => {
    console.log("params: ",params)
    if(!params?.event?.bootloaderMode){
      requestBootloaderMode.open({})
    }
  }, [params?.event])

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
      <Button colorScheme='green' onClick={onAcceptUpdate}>Update</Button>
      {/*<Button colorScheme='yellow' onClick={onSkipUpdate}>skip</Button>*/}

    </ModalBody>
  )
}
