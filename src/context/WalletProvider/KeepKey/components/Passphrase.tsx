import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  Input,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import { useCallback, useRef, useState } from 'react'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectWalletId } from 'state/slices/common-selectors'
import { portfolio } from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

export const KeepKeyPassphrase = () => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const {
    state: { deviceId, keyring },
    dispatch,
  } = useWallet()
  const wallet = keyring.get(deviceId ?? '')
  const walletId = useAppSelector(selectWalletId)
  const appDispatch = useAppDispatch()

  const inputRef = useRef<HTMLInputElement | null>(null)

  const handleSubmit = useCallback(async () => {
    if (!wallet || !walletId) return
    setLoading(true)
    const passphrase = inputRef.current?.value
    try {
      // The event handler will pick up the response to the sendPin request
      await wallet?.sendPassphrase(passphrase ?? '')
      setError(null)
      // Clear all previous wallet meta
      appDispatch(portfolio.actions.clearWalletMetadata(walletId))
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e) {
      setError('modals.keepKey.passphrase.error')
    } finally {
      setLoading(false)
    }
  }, [appDispatch, dispatch, wallet, walletId])

  return (
    <>
      <ModalHeader>
        <Text translation={'modals.keepKey.passphrase.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='text.subtle' translation={'modals.keepKey.passphrase.body'} />
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
        <Button
          width='full'
          size='lg'
          colorScheme='blue'
          onClick={handleSubmit}
          isDisabled={loading}
        >
          <Text translation={'modals.keepKey.passphrase.button'} />
        </Button>
      </ModalBody>
    </>
  )
}
