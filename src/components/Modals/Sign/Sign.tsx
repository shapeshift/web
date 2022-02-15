import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Textarea
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import React, { useRef, useState } from 'react'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'

export const SignModal = (input: any) => {
  const { pioneer } = useWallet()
  const [error] = useState<string | null>(null)
  const [loading] = useState(false)
  const [show, setShow] = React.useState(false)
  const { sign } = useModal()
  const { close, isOpen } = sign
  const inputRef = useRef<HTMLInputElement | null>(null)
  const HDwalletPayload = input.invocation.unsignedTx.HDwalletPayload

  const HandleSubmit = async () => {
    //show sign
    let signedTx = await pioneer.signTx(input.invocation.unsignedTx)
    ipcRenderer.send('onSignedTx', signedTx)
    //onCloseModal
    ipcRenderer.send('onCloseModal', {})
  }

  const HandleReject = async () => {
    //show sign
    ipcRenderer.send('unlockWindow', {})
    //onCloseModal
    ipcRenderer.send('onCloseModal', {})
    close()
  }

  const handleToggle = () => setShow(!show)

  // @ts-ignore
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        ipcRenderer.send('unlockWindow', {})
        ipcRenderer.send('onCloseModal', {})
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
          <Text translation={'modals.sign.header'} />
        </ModalHeader>
        <ModalBody>
          {/*<div>unsignedTx: {JSON.stringify(unsignedTx)}</div>*/}
          {/*<div>HDwalletPayload: {JSON.stringify(HDwalletPayload)}</div>*/}

          {/*<div>type: {JSON.stringify(input?.invocation?.unsignedTx?.transaction?.type)}</div>*/}
          <small>
            {/*<div>invocation: {invocationId}</div>*/}
            <div>Transation Type: {JSON.stringify(input?.invocation?.unsignedTx?.type)}</div>
            <div>network: {JSON.stringify(input?.invocation?.unsignedTx?.network)}</div>

            <Box w='100%' p={4} color='white'>
              <div>
                Extended Validation: <Badge>FAIL</Badge>
              </div>
              <div>verbal summary: {JSON.stringify(input?.invocation?.unsignedTx?.verbal)}</div>
            </Box>

            <div>from: {JSON.stringify(input?.invocation?.unsignedTx?.swap?.addressFrom)}</div>
            <div>
              to: {JSON.stringify(input?.invocation?.unsignedTx?.swap?.inboundAddress.address)}
            </div>

            <Text color='gray.500' translation={'modals.sign.body'} />
            <div>protocol: {JSON.stringify(input?.invocation?.unsignedTx?.swap?.protocol)}</div>
            <Box w='100%' p={4} color='white'>
              <div>
                router: {JSON.stringify(input?.invocation?.unsignedTx?.swap?.inboundAddress.router)}
              </div>
              <div>memo: {JSON.stringify(input?.invocation?.unsignedTx?.swap?.memo)}</div>
            </Box>
            <div>amount: {JSON.stringify(input?.invocation?.unsignedTx?.swap?.amount)}</div>
          </small>

          <Collapse in={show}>
            <div>
              HDwalletPayload:
              <Textarea
                value={JSON.stringify(HDwalletPayload, undefined, 4)}
                size='md'
                resize='vertical'
              />
            </div>
          </Collapse>
          <Button size='sm' onClick={handleToggle} mt='1rem'>
            {show ? 'hide' : 'Advanced'}
          </Button>

          <Input
            ref={inputRef}
            size='lg'
            variant='filled'
            mt={3}
            mb={6}
            autoComplete='current-password'
          />
          {error && (
            <Alert status='error'>
              <AlertIcon />
              <AlertDescription>
                <Text translation={error} />
              </AlertDescription>
            </Alert>
          )}
          <Button
            isFullWidth
            size='lg'
            colorScheme='blue'
            onClick={HandleSubmit}
            disabled={loading}
          >
            <Text translation={'modals.sign.sign'} />
          </Button>
          <br />
          <Button size='sm' colorScheme='red' onClick={HandleReject}>
            <Text translation={'modals.sign.reject'} />
          </Button>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
