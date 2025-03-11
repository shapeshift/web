import {
  Button,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  ModalBody,
  ModalHeader,
  useToast,
  useUnmountEffect,
} from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { createRevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import type { NativeWalletValues } from '@/context/WalletProvider/NativeWallet/types'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const NativeRename = () => {
  const translate = useTranslate()
  const [showPw, setShowPw] = useState<boolean>(false)
  const { state, dispatch } = useWallet()
  const [revocableWallet, setRevocableWallet] = useState(
    createRevocableWallet({
      id: state.walletInfo?.deviceId,
      label: state.walletInfo?.name,
    }),
  )
  const toast = useToast()

  useUnmountEffect(() => {
    revocableWallet?.revoke()
    setRevocableWallet(
      createRevocableWallet({
        id: state.walletInfo?.deviceId,
        label: state.walletInfo?.name,
      }),
    )
  }, [])

  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<NativeWalletValues>({ mode: 'onChange', shouldUnregister: true })

  const handleShowClick = useCallback(() => setShowPw(!showPw), [showPw])
  const onSubmit = useCallback(
    async (values: FieldValues) => {
      try {
        const Vault = await import('@shapeshiftoss/hdwallet-native-vault').then(m => m.Vault)
        const vault = await Vault.open(revocableWallet.id, values.password)
        if (values.name.length === 0) {
          const result = window.confirm(translate('walletProvider.shapeShift.rename.confirmDelete'))
          if (result) {
            vault.meta.delete('name')
            await vault.save()
            dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
            dispatch({ type: WalletActions.SET_WALLET_LABEL, payload: '' })
          }
        } else {
          vault.meta.set('name', values.name)
          await vault.save()
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          dispatch({ type: WalletActions.SET_WALLET_LABEL, payload: values.name })
        }

        toast({
          title: translate('walletProvider.shapeShift.rename.success'),
          status: 'success',
          duration: 5000,
          isClosable: true,
        })
      } catch (e) {
        console.error(e)
        setError('password', {
          type: 'manual',
          message: translate('modals.shapeShift.password.error.invalid'),
        })
      }
    },
    [dispatch, revocableWallet.id, setError, toast, translate],
  )

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  const nameInputProps = useMemo(
    () =>
      register('name', {
        maxLength: {
          value: 64,
          message: translate('modals.shapeShift.password.error.maxLength', { length: 64 }),
        },
      }),
    [register, translate],
  )

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
        <Text translation={'walletProvider.shapeShift.rename.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='text.subtle' translation={'walletProvider.shapeShift.rename.body'} />
        <form onSubmit={handleFormSubmit}>
          <FormControl mb={6} isInvalid={Boolean(errors.name)}>
            <Input
              {...nameInputProps}
              size='lg'
              variant='filled'
              id='name'
              placeholder={translate('walletProvider.shapeShift.rename.walletName')}
            />
            <FormErrorMessage>{errors?.name?.message}</FormErrorMessage>
          </FormControl>
          <FormControl mb={6} isInvalid={Boolean(errors.password)}>
            <InputGroup size='lg' variant='filled'>
              <Input
                {...passwordInputProps}
                pr='4.5rem'
                type={showPw ? 'text' : 'password'}
                placeholder={translate('modals.shapeShift.password.placeholder')}
                autoComplete={'password'}
                id='password'
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
            isDisabled={Boolean(errors.name)}
          >
            <Text translation={'walletProvider.shapeShift.rename.button'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
