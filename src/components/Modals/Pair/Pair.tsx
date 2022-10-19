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
  Text as ChakraText,
} from '@chakra-ui/react'
import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
// import { SessionTypes } from '@walletconnect/types'
import { ipcRenderer } from 'electron'
import { useEffect, useState } from 'react'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'

export type PairingProps = NativePairingProps | WalletConnectPairingProps

export type NativePairingProps = {
  type: 'native'
  data: {
    serviceName: string
    serviceImageUrl: string
  }
  nonce: string
}

export type WalletConnectPairingProps = {
  type: 'walletconnect'
  data: any
  nonce: string
}

export const PairModal = (input: PairingProps) => {
  const [error] = useState<string | null>(null)
  const [loading] = useState(false)
  const { pair } = useModal()
  const { close, isOpen } = pair
  const [accounts, setAccounts] = useState<Array<string>>([])

  const { state, dispatch } = useWallet()

  useEffect(() => {
    if (input.type === 'walletconnect') {
      ;(state.wallet as KeepKeyHDWallet)
        .ethGetAddress({
          addressNList: [2147483692, 2147483708, 2147483648, 0, 0],
          showDisplay: false,
        })
        .then(address => {
          setAccounts([address])
        })
    }
  }, [state.wallet, input.type])

  const HandleSubmit = async () => {
    if (input.type === 'native') ipcRenderer.send(`@bridge/approve-service-${input.nonce}`, input)
    if (input.type === 'walletconnect') {
      ipcRenderer.send(`@walletconnect/approve-${input.nonce}`, { proposal: input.data, accounts })
      dispatch({
        type: WalletActions.SET_WALLET_CONNECT_APP,
        payload: input.data?.params[0]?.peerMeta,
      })
    }
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
            <Text
              translation={
                input.type === 'native'
                  ? 'modals.pair.native.header'
                  : 'modals.pair.walletconnect.header'
              }
            />
          </ModalHeader>
          <ModalBody>
            <Stack spacing={4} mb={4}>
              <Box display='flex' flexDirection='row' justifyContent='center' alignItems='center'>
                <Image
                  src={
                    input.type === 'native'
                      ? input.data.serviceImageUrl
                      : input?.data?.params[0]?.peerMeta?.icons[0]
                  }
                  borderRadius='full'
                  height='10'
                  width='10'
                />

                <Box display='flex' flexDirection='column'>
                  <Text
                    translation={[
                      'modals.pair.native.body',
                      {
                        serviceName:
                          input.type === 'native'
                            ? input.data.serviceName
                            : input?.data?.params[0]?.peerMeta.name,
                      },
                    ]}
                    pl='2'
                  />
                  {input.type === 'walletconnect' ? (
                    <ChakraText pl={2} color='gray.500' fontSize='sm'>
                      {input?.data?.params[0]?.peerMeta.description}
                    </ChakraText>
                  ) : null}
                </Box>
              </Box>
              {input.type === 'walletconnect' && (
                <Box display='flex' flexDirection='column' gap={1}>
                  {/*<Text translation={'modals.pair.walletconnect.chain'} />*/}
                  {/*{input.data.permissions.blockchain.chains &&*/}
                  {/*  input.data.permissions.blockchain.chains.map(chain => (*/}
                  {/*    <ChakraText color='gray.500'>{chain}</ChakraText>*/}
                  {/*  ))}*/}
                  {/*<Text translation={'modals.pair.walletconnect.relay'} />*/}
                  {/*<ChakraText color='gray.500'>{input.data.relay.protocol}</ChakraText>*/}
                  {/*<Text translation={'modals.pair.walletconnect.methods'} />*/}
                  {/*<ChakraText color='gray.500'>*/}
                  {/*  {input.data.permissions.jsonrpc.methods.join(', ')}*/}
                  {/*</ChakraText>*/}
                  {/*<Text translation={'accounts.accounts'} />*/}
                  {/*{accounts &&*/}
                  {/*  accounts.map(address => <ChakraText color='gray.500'>{address}</ChakraText>)}*/}
                </Box>
              )}
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
