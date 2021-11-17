import {
  Button,
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
  ModalOverlay
} from '@chakra-ui/react'
import * as native from '@shapeshiftoss/hdwallet-native'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import React, { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { KeyManager, SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

export const PasswordModal = ({ deviceId }: { deviceId: string }) => {
  const { nativePassword } = useModal()
  const { close, isOpen } = nativePassword
  const { state, dispatch } = useWallet()
  const wallet = state.keyring.get<NativeHDWallet>(deviceId)

  const [showPw, setShowPw] = useState<boolean>(false)

  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting }
  } = useForm()

  const handleShowClick = () => setShowPw(!showPw)
  const onSubmit = async (values: FieldValues) => {
    try {
      const vault = await Vault.open(deviceId, values.password)
      const mnemonic = (await vault.get('#mnemonic')) as native.crypto.Isolation.Core.BIP39.Mnemonic
      mnemonic.addRevoker?.(() => vault.revoke())
      await wallet?.loadDevice({
        mnemonic,
        deviceId
      })
      const { name, icon } = SUPPORTED_WALLETS[KeyManager.Native]
      dispatch({ type: WalletActions.SET_WALLET, payload: { wallet, name, icon, deviceId } })
      dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      close()
    } catch (e) {
      setError(
        'password',
        {
          type: 'manual',
          message: 'walletProvider.shapeShift.password.error.invalid'
        },
        { shouldFocus: true }
      )
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <ModalCloseButton ml='auto' borderRadius='full' position='static' />
        <ModalHeader>
          <Text translation={'walletProvider.shapeShift.password.header'} />
        </ModalHeader>
        <ModalBody>
          <Text mb={6} color='gray.500' translation={'walletProvider.shapeShift.password.body'} />
          <form onSubmit={handleSubmit(onSubmit)}>
            <FormControl isInvalid={errors.password} mb={6}>
              <InputGroup size='lg' variant='filled'>
                <Input
                  {...register('password', {
                    required: 'This is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' }
                  })}
                  pr='4.5rem'
                  type={showPw ? 'text' : 'password'}
                  placeholder='Enter password'
                  id='password'
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
              <FormErrorMessage>
                <Text translation={errors?.password?.message} />
              </FormErrorMessage>
            </FormControl>
            <Button colorScheme='blue' size='lg' isFullWidth type='submit' isLoading={isSubmitting}>
              <Text translation={'walletProvider.shapeShift.password.button'} />
            </Button>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
