import {
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
  Text as ChakraText
} from '@chakra-ui/react'
import { ipcRenderer } from 'electron'
import { useState } from 'react'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { SessionTypes } from '@walletconnect/types'

export type PairingProps = NativePairingProps | WalletConnectPairingProps

export type NativePairingProps = {
  type: 'native',
  data: {
    serviceName: string
    serviceImageUrl: string
  }
  nonce: string
}

export type WalletConnectPairingProps = {
  type: 'walletconnect',
  data: SessionTypes.Proposal
  nonce: string
}

export const PairModal = (input: PairingProps) => {
  const [error] = useState<string | null>(null)
  const [loading] = useState(false)
  const { pair } = useModal()
  const { close, isOpen } = pair

  const HandleSubmit = async () => {
    if (input.type === 'native') ipcRenderer.send(`@bridge/approve-service-${input.nonce}`, input)
    close()
  }

  const HandleReject = async () => {
    if (input.type === 'native') ipcRenderer.send(`@bridge/reject-service-${input.nonce}`, input)
    close()
  }

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
            <Text translation={input.type == 'native' ? 'modals.pair.header.native' : 'modals.pair.header.walletconnect'} />
          </ModalHeader>
          <ModalBody>
            <Stack spacing={4} mb={4}>
              <Box display='flex' flexDirection='row' justifyContent='center' alignItems='center'>
                <Image src={input.type == 'native' ? input.data.serviceImageUrl : input.data.proposer.metadata.icons[0]} borderRadius='full' height='10' width='10' />

                <Box display='flex' flexDirection='column'>
                  <Text
                    translation={['modals.pair.body', { serviceName: input.type == 'native' ? input.data.serviceName : input.data.proposer.metadata.name }]}
                    pl='2'
                  />
                  {input.type == 'walletconnect' ? <ChakraText pl={2} color='gray.500' fontSize='sm'>{input.data.proposer.metadata.description}</ChakraText> : null}</Box>
              </Box>
              {error && (
                <Alert status='error'>
                  <AlertIcon />
                  <AlertDescription>
                    <Text translation={error} />
                  </AlertDescription>
                </Alert>
              )}
              <Button
                width='full'
                size='lg'
                colorScheme='blue'
                onClick={HandleSubmit}
                disabled={loading}
              >
                <Text translation={'modals.pair.cta.pair'} />
              </Button>
              <Button
                width='full'
                size='lg'
                colorScheme='red'
                onClick={HandleReject}
                disabled={loading}
              >
                <Text translation={'modals.pair.cta.reject'} />
              </Button>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </SlideTransition>
  )
}
