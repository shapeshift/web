import {
  Box,
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
  ModalOverlay
} from '@chakra-ui/react'
import * as native from '@shapeshiftoss/hdwallet-native'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash, FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { IconCircle } from 'components/IconCircle'
import { RawText, Text } from 'components/Text'
import { useModal } from 'context/ModalProvider/ModalProvider'
import { KeyManager, SUPPORTED_WALLETS } from 'context/WalletProvider/config'
import { getNativeLocalWalletName } from 'context/WalletProvider/local-wallet'
import { useWallet, WalletActions } from 'context/WalletProvider/WalletProvider'

export const PasswordModal = ({ deviceId }: { deviceId: string }) => {
  const translate = useTranslate()
  const { nativePassword } = useModal()
  const { close, isOpen } = nativePassword
  const { state, dispatch, disconnect } = useWallet()
  const wallet = state.keyring.get<NativeHDWallet>(deviceId)

  const [showPw, setShowPw] = useState<boolean>(false)

  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting }
  } = useForm({ mode: 'onChange', shouldUnregister: true })

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
      dispatch({
        type: WalletActions.SET_WALLET,
        payload: { wallet, name, icon, deviceId, meta: { label: vault.meta.get('name') as string } }
      })
      dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
      close()
    } catch (e) {
      setError(
        'password',
        {
          type: 'manual',
          message: translate('modals.shapeShift.password.error.invalid')
        },
        { shouldFocus: true }
      )
    }
  }

  const onCloseButtonClick = () => {
    if (state.isLoadingLocalWallet) {
      disconnect()
    }
    close()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      isCentered
      closeOnOverlayClick={false}
      closeOnEsc={false}
      trapFocus={false}
    >
      <ModalOverlay />
      <ModalContent justifyContent='center' px={3} pt={3} pb={6}>
        <ModalCloseButton
          ml='auto'
          borderRadius='full'
          position='static'
          onClick={onCloseButtonClick}
        />
        <ModalHeader>
          <Text translation={'modals.shapeShift.password.header'} />
        </ModalHeader>
        <ModalBody>
          {state.isLoadingLocalWallet ? (
            <Button
              px={4}
              variant='unstyled'
              display='flex'
              mb={4}
              leftIcon={
                <IconCircle boxSize={10}>
                  <FaWallet />
                </IconCircle>
              }
              onClick={() => {}}
              data-test='native-saved-wallet-button'
            >
              <Box textAlign='left'>
                <RawText
                  fontWeight='medium'
                  maxWidth='260px'
                  lineHeight='1.2'
                  mb={1}
                  isTruncated
                  data-test='native-saved-wallet-name'
                >
                  {getNativeLocalWalletName()}
                </RawText>
              </Box>
            </Button>
          ) : (
            <Text mb={6} color='gray.500' translation={'modals.shapeShift.password.body'} />
          )}
          <form onSubmit={handleSubmit(onSubmit)}>
            <FormControl isInvalid={errors.password} mb={6}>
              <InputGroup size='lg' variant='filled'>
                <Input
                  {...register('password', {
                    required: translate('modals.shapeShift.password.error.required'),
                    minLength: {
                      value: 8,
                      message: translate('modals.shapeShift.password.error.length', { length: 8 })
                    }
                  })}
                  pr='4.5rem'
                  type={showPw ? 'text' : 'password'}
                  placeholder={translate('modals.shapeShift.password.placeholder')}
                  autoComplete={'password'}
                  id='password'
                  data-test='wallet-password-input'
                />
                <InputRightElement>
                  <IconButton
                    aria-label={translate(`modals.shapeShift.password.${showPw ? 'hide' : 'show'}`)}
                    h='1.75rem'
                    size='sm'
                    onClick={handleShowClick}
                    icon={!showPw ? <FaEye /> : <FaEyeSlash />}
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage>{errors?.password?.message}</FormErrorMessage>
            </FormControl>
            <Button
              colorScheme='blue'
              size='lg'
              isFullWidth
              type='submit'
              isLoading={isSubmitting}
              data-test='wallet-password-submit-button'
            >
              <Text translation={'walletProvider.shapeShift.password.button'} />
            </Button>
          </form>
          {state.isLoadingLocalWallet && (
            <Flex direction={['column', 'row']} mt={4} justifyContent='center' alignItems='center'>
              <Text mb={[3]} color='gray.500' translation={'common.or'} />
              <Button
                variant='link'
                mb={[3]}
                ml={[0, 1.5]}
                borderTopRadius='none'
                colorScheme='blue'
                onClick={() => {
                  close()
                  disconnect()
                  dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
                }}
              >
                {translate('walletProvider.shapeShift.password.connect')}
              </Button>
            </Flex>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
