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
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import type { crypto, NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash, FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { IconCircle } from 'components/IconCircle'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { getNativeLocalWalletName } from 'context/WalletProvider/local-wallet'
import { NativeConfig } from 'context/WalletProvider/NativeWallet/config'
import { useWallet } from 'hooks/useWallet/useWallet'

import type { NativeWalletValues } from '../types'

export const EnterPassword = () => {
  const translate = useTranslate()
  const { state, dispatch, disconnect } = useWallet()
  const { deviceId } = state
  const wallet = state.keyring.get<NativeHDWallet>(deviceId)

  const [showPw, setShowPw] = useState<boolean>(false)

  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting, isValid },
  } = useForm<NativeWalletValues>({ mode: 'onChange', shouldUnregister: true })

  const handleShowClick = () => setShowPw(!showPw)
  const onSubmit = async (values: FieldValues) => {
    try {
      const vault = await Vault.open(deviceId, values.password)
      const mnemonic = (await vault.get('#mnemonic')) as crypto.Isolation.Core.BIP39.Mnemonic
      mnemonic.addRevoker?.(() => vault.revoke())
      await wallet?.loadDevice({
        mnemonic,
        deviceId,
      })
      const { name, icon } = NativeConfig
      dispatch({
        type: WalletActions.SET_WALLET,
        payload: {
          wallet,
          name,
          icon,
          deviceId,
          connectedType: KeyManager.Native,
          meta: { label: vault.meta.get('name') as string },
        },
      })
      dispatch({ type: WalletActions.SET_IS_CONNECTED, payload: true })
      dispatch({ type: WalletActions.SET_LOCAL_WALLET_LOADING, payload: false })
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
    } catch (e) {
      setError(
        'password',
        {
          type: 'manual',
          message: translate('modals.shapeShift.password.error.invalid'),
        },
        { shouldFocus: true },
      )
    }
  }

  return (
    <>
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
                noOfLines={1}
                data-test='native-saved-wallet-name'
              >
                {getNativeLocalWalletName()}
              </RawText>
            </Box>
          </Button>
        ) : (
          <Text mb={6} color='text.subtle' translation={'modals.shapeShift.password.body'} />
        )}
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl isInvalid={Boolean(errors.password)} mb={6}>
            <InputGroup size='lg' variant='filled'>
              <Input
                {...register('password', {
                  required: translate('modals.shapeShift.password.error.required'),
                  minLength: {
                    value: 8,
                    message: translate('modals.shapeShift.password.error.length', { length: 8 }),
                  },
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
            width='full'
            type='submit'
            isLoading={isSubmitting}
            isDisabled={!isValid}
            data-test='wallet-password-submit-button'
          >
            <Text translation={'walletProvider.shapeShift.password.button'} />
          </Button>
        </form>
        {state.isLoadingLocalWallet && (
          <Flex direction={['column', 'row']} mt={4} justifyContent='center' alignItems='center'>
            <Text mb={[3]} color='text.subtle' translation={'common.or'} />
            <Button
              variant='link'
              mb={[3]}
              ml={[0, 1.5]}
              borderTopRadius='none'
              colorScheme='blue'
              onClick={() => {
                disconnect()
                dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
              }}
            >
              {translate('walletProvider.shapeShift.password.connect')}
            </Button>
          </Flex>
        )}
      </ModalBody>
    </>
  )
}
