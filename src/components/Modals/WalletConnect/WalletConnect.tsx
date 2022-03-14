import {
  Input,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  useClipboard
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { useState } from 'react'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'

export type PairingProps = {
  serviceName: string
  serviceImageUrl: string
  nonce: string
}

export const WalletConnectModal = (input: any) => {
  const [error] = useState<string | null>(null)
  const [loading] = useState(false)
  const [uri, setUri] = useState('uri:.....')
  const { walletConnect } = useModal()
  const { close, isOpen } = walletConnect
  const { hasCopied, onCopy } = useClipboard(uri)

  const HandleSubmit = async (e:any) => {
    console.log("uri: ",uri)
    ipcRenderer.send(`@connect/pair`, uri)
  }

  const handleInputChange = (e: { target: { value: any } }) => setUri(e.target.value)

  // const HandleReject = async () => {
  //   ipcRenderer.send(`@bridge/reject-service-${input.nonce}`, input)
  //   close()
  // }

  return (
    <SlideTransition>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          ipcRenderer.send('unlockWindow', {})
          close()
        }}
        isCentered
        closeOnOverlayClick={false}
        closeOnEsc={false}
      >
        <ModalOverlay />
        <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
          <ModalCloseButton ml='auto' borderRadius='full' position='static' />
          <ModalHeader>
            <Text translation={'modals.pair.header'} />
          </ModalHeader>
          <ModalBody>
            <Stack spacing={4} mb={4}>
              <Box display='inline-flex' justifyContent='center' alignItems='center'>

              </Box>
              {error && (
                <Alert status='error'>
                  <AlertIcon />
                  <AlertDescription>
                    <Text translation={error} />
                  </AlertDescription>
                </Alert>
              )}
              <FormControl>
                <FormLabel htmlFor='uri'>URI</FormLabel>
                <Input
                    id='uri'
                    value={uri}
                    onChange={handleInputChange}
                />
                <FormHelperText>Enter Wallet Connect URI</FormHelperText>
                <Button
                    mt={4}
                    colorScheme='teal'
                    type='submit'
                    onClick={HandleSubmit}
                >
                  Submit
                </Button>
              </FormControl>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </SlideTransition>
  )
}
