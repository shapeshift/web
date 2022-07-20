import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Input,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'

export const KeepKeyPassphrase = ({ deviceId }: { deviceId: string }) => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { state, dispatch } = useWallet()
  const wallet = state.keyring.get(deviceId)

  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    const passphrase = inputRef.current?.value
    try {
      // The event handler will pick up the response to the sendPin request
      await wallet?.sendPassphrase(passphrase ?? '')
      setError(null)
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e) {
      setError('modals.keepKey.passphrase.error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'modals.keepKey.passphrase.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='gray.500' translation={'modals.keepKey.passphrase.body'} />
        <Input
          type='password'
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
        <Button width='full' size='lg' colorScheme='blue' onClick={handleSubmit} disabled={loading}>
          <Text translation={'modals.keepKey.passphrase.button'} />
        </Button>
      </ModalBody>
    </>
  )
}
