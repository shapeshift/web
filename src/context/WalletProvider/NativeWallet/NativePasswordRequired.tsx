import {
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  useDisclosure
} from '@chakra-ui/react'
import { NativeAdapter, NativeEvents, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { RawText } from 'components/Text'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocalStorage } from 'hooks/useLocalStorage/useLocalStorage'
import { getEncryptedWallet } from 'lib/nativeWallet'
import head from 'lodash/head'
import toPairs from 'lodash/toPairs'
import React, { useState } from 'react'
import { useEffect } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'

type StoredWallets = Record<string, string>

export const NativePasswordRequired = ({
  onConnect
}: {
  onConnect: (wallet: NativeHDWallet) => void
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [wallet, setWallet] = useState<NativeHDWallet | null>(null)
  const [showPw, setShowPw] = useState<boolean>(false)
  const { state } = useWallet()
  const [localStorageWallet] = useLocalStorage<StoredWallets>('wallet', {})

  const handleShowClick = () => setShowPw(!showPw)
  const onSubmit = async (values: FieldValues) => {
    // @TODO: Grab the wallet that emitted the event by deviceId
    const storedWallet = localStorageWallet ? head(toPairs(localStorageWallet)) : null
    if (storedWallet) {
      try {
        const [deviceId, encryptedWalletString] = storedWallet
        // @TODO: Replace this encryption with a most robust method
        const encryptedWallet = await getEncryptedWallet(values.password, encryptedWalletString)
        const maybeWallet: NativeHDWallet | null = state.keyring.get(deviceId)
        if (maybeWallet) {
          maybeWallet.loadDevice({
            mnemonic: await encryptedWallet.decrypt(),
            deviceId: encryptedWallet.deviceId
          })
          setWallet(maybeWallet)
        }
      } catch (e) {
        console.error('storedWallets', e)
        setError('password', { message: 'Invalid password' })
      }
    } else {
      clearErrors()
      onClose()
    }
  }

  const {
    handleSubmit,
    register,
    setError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm()

  useEffect(() => {
    if (!(localStorageWallet && state.adapters?.native)) return
    ;(async () => {
      for (const [deviceId] of Object.entries(localStorageWallet)) {
        try {
          const device = await (state.adapters?.native as NativeAdapter).pairDevice(deviceId)
          await device?.initialize()
          console.info('Found native wallet', deviceId)
        } catch (e) {
          console.error('Error pairing native wallet', deviceId)
        }
      }
    })()
  }, [localStorageWallet, state.adapters])

  useEffect(() => {
    if (state.keyring) {
      state.keyring.on(['Native', '*', NativeEvents.MNEMONIC_REQUIRED], onOpen)
      state.keyring.on(['Native', '*', NativeEvents.READY], () => {
        clearErrors()
        onClose()
        // safe to non-null assert here as the wallet as emitted a ready event
        onConnect(wallet!)
      })
    }
    return () => {
      state.keyring.off(NativeEvents.MNEMONIC_REQUIRED, onOpen)
      state.keyring.off(NativeEvents.READY, () => {
        clearErrors()
        onClose()
        // safe to non-null assert here as the wallet as emitted a ready event
        onConnect(wallet!)
      })
    }
    // We don't want to add a bunch of event listeners by re-rendering this effect
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [state.keyring, wallet])

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <Flex justifyContent='space-between' alignItems='center' position='relative'>
          <ModalCloseButton ml='auto' borderRadius='full' position='static' />
        </Flex>
        <ModalHeader>Enter your password</ModalHeader>
        <ModalBody>
          <RawText mb={6} color='gray.500'>
            Enter a password to encrypt your wallet. In order to securely store your keys we will
            encrypt them, choose a string password you can remember
          </RawText>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FormControl isInvalid={errors.password} mb={6}>
              <InputGroup size='lg' variant='filled'>
                <Input
                  {...register('password', {
                    required: 'This is required',
                    minLength: { value: 8, message: 'Minimum length should be 8' }
                  })}
                  pr='4.5rem'
                  type={showPw ? 'text' : 'password'}
                  placeholder='Enter password'
                />
                <InputRightElement>
                  <IconButton
                    aria-label={!showPw ? 'Show password' : 'Hide password'}
                    h='1.75rem'
                    size='sm'
                    onClick={handleShowClick}
                    icon={!showPw ? <FaEye /> : <FaEyeSlash />}
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors?.password?.message}</FormErrorMessage>
            </FormControl>
            <Button colorScheme='blue' size='lg' isFullWidth type='submit' isLoading={isSubmitting}>
              Next
            </Button>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
