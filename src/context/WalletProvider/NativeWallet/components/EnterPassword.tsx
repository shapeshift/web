import type { ResponsiveValue } from '@chakra-ui/react'
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
import type { Property } from 'csstype'
import { useCallback, useMemo, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash, FaWallet } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { IconCircle } from 'components/IconCircle'
import { RawText, Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useLocalWallet } from 'context/WalletProvider/local-wallet'
import { NativeConfig } from 'context/WalletProvider/NativeWallet/config'
import { useWallet } from 'hooks/useWallet/useWallet'

import type { NativeWalletValues } from '../types'

const mbProp = [3]
const mlProp = [0, 1.5]
const directionProp: ResponsiveValue<Property.FlexDirection> = ['column', 'row']

const leftIcon = (
  <IconCircle boxSize={10}>
    <FaWallet />
  </IconCircle>
)

export const EnterPassword = () => {
  const translate = useTranslate()
  const { state, dispatch, disconnect } = useWallet()
  const localWallet = useLocalWallet()
  const { nativeWalletPendingDeviceId: deviceId, keyring } = state

  const [showPw, setShowPw] = useState<boolean>(false)

  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting, isValid },
  } = useForm<NativeWalletValues>({ mode: 'onChange', shouldUnregister: true })

  const handleShowClick = useCallback(() => setShowPw(!showPw), [showPw])
  const onSubmit = useCallback(
    async (values: FieldValues) => {
      try {
        if (!deviceId) return
        const wallet = keyring.get<NativeHDWallet>(deviceId)
        const Vault = await import('@shapeshiftoss/hdwallet-native-vault').then(m => m.Vault)
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
        dispatch({
          type: WalletActions.SET_IS_CONNECTED,
          payload: true,
        })
        dispatch({ type: WalletActions.RESET_NATIVE_PENDING_DEVICE_ID })
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
    },
    [keyring, deviceId, dispatch, setError, translate],
  )

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])
  const handleDisconnect = useCallback(() => {
    disconnect()
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
  }, [disconnect, dispatch])

  const passwordInputProps = useMemo(
    () =>
      register('password', {
        required: translate('modals.shapeShift.password.error.required'),
        minLength: {
          value: 8,
          message: translate('modals.shapeShift.password.error.length', { length: 8 }),
        },
      }),
    [register, translate],
  )

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
            leftIcon={leftIcon}
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
                {localWallet.nativeLocalWalletName}
              </RawText>
            </Box>
          </Button>
        ) : (
          <Text mb={6} color='text.subtle' translation={'modals.shapeShift.password.body'} />
        )}
        <form onSubmit={handleFormSubmit}>
          <FormControl isInvalid={Boolean(errors.password)} mb={6}>
            <InputGroup size='lg' variant='filled'>
              <Input
                {...passwordInputProps}
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
          <Flex direction={directionProp} mt={4} justifyContent='center' alignItems='center'>
            <Text mb={mbProp} color='text.subtle' translation={'common.or'} />
            <Button
              variant='link'
              mb={mbProp}
              ml={mlProp}
              borderTopRadius='none'
              colorScheme='blue'
              onClick={handleDisconnect}
            >
              {translate('walletProvider.shapeShift.password.connect')}
            </Button>
          </Flex>
        )}
      </ModalBody>
    </>
  )
}
