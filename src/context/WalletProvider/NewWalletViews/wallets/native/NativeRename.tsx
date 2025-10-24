import {
  Button,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  useToast,
} from '@chakra-ui/react'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useLocalWallet } from '@/context/WalletProvider/local-wallet'
import { createRevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import type { NativeWalletValues } from '@/context/WalletProvider/NativeWallet/types'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const NativeRename = () => {
  const translate = useTranslate()
  const [showPw, setShowPw] = useState<boolean>(false)
  const { state, dispatch } = useWallet()
  const { setLocalNativeWalletName } = useLocalWallet()
  const [revocableWallet, setRevocableWallet] = useState(
    createRevocableWallet({
      id: state.walletInfo?.deviceId,
      label: state.walletInfo?.name,
    }),
  )
  const toast = useToast()

  // Revoke on unmount
  useEffect(
    () => () => {
      revocableWallet?.revoke()
      setRevocableWallet(
        createRevocableWallet({
          id: state.walletInfo?.deviceId,
          label: state.walletInfo?.name,
        }),
      )
    },
    // Don't add revoker and related deps here or problems
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

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
          return setError('name', {
            type: 'manual',
            message: translate('walletProvider.shapeShift.rename.error.empty'),
          })
        } else {
          vault.meta.set('name', values.name)
          await vault.save()
          dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
          dispatch({ type: WalletActions.SET_WALLET_LABEL, payload: values.name })
          setLocalNativeWalletName(values.name)
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
    [dispatch, revocableWallet.id, setError, toast, translate, setLocalNativeWalletName],
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

  const walletTranslations: [string, number | InterpolationOptions] = useMemo(() => {
    return ['walletProvider.shapeShift.rename.body', { name: state.walletInfo?.meta?.label }]
  }, [state.walletInfo?.meta?.label])

  return (
    <>
      <DialogHeader>
        <DialogHeader.Middle>
          <Text translation={'walletProvider.shapeShift.rename.header'} />
        </DialogHeader.Middle>
      </DialogHeader>
      <DialogBody>
        <Text mb={6} color='text.subtle' translation={walletTranslations} />
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
      </DialogBody>
    </>
  )
}
