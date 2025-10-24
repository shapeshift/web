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
import { useForm, useWatch } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { createRevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

const MIN_PASSWORD_LENGTH = 8

export const NativeDelete = () => {
  const translate = useTranslate()
  const [showPw, setShowPw] = useState<boolean>(false)
  const toast = useToast()
  const { state, dispatch } = useWallet()
  const [revocableWallet, setRevocableWallet] = useState(
    createRevocableWallet({
      id: state.walletInfo?.deviceId,
      label: state.walletInfo?.meta?.label,
    }),
  )

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
    control,
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<{ password: string }>({ mode: 'onChange' })

  const password = useWatch({ control, name: 'password' })

  const handleShowClick = useCallback(() => setShowPw(!showPw), [showPw])

  const onSubmit = useCallback(
    async (values: FieldValues) => {
      try {
        const Vault = await import('@shapeshiftoss/hdwallet-native-vault').then(m => m.Vault)
        // Verify password is correct by attempting to open the vault
        await Vault.open(revocableWallet.id, values.password)

        if (!revocableWallet.id) {
          throw new Error('Wallet ID is undefined')
        }

        // If we get here, the password was correct - proceed with deletion
        await Vault.delete(revocableWallet.id)

        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: false })
        dispatch({ type: WalletActions.RESET_STATE })

        toast({
          title: translate('walletProvider.shapeShift.delete.success'),
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

  const passwordInputProps = useMemo(
    () =>
      register('password', {
        required: translate('modals.shapeShift.password.error.required'),
        minLength: {
          value: MIN_PASSWORD_LENGTH,
          message: translate('modals.shapeShift.password.error.length', {
            length: MIN_PASSWORD_LENGTH,
          }),
        },
      }),
    [register, translate],
  )

  const walletTranslations: [string, number | InterpolationOptions] = useMemo(() => {
    return ['walletProvider.shapeShift.delete.body', { name: state.walletInfo?.meta?.label }]
  }, [state.walletInfo?.meta?.label])

  return (
    <>
      <DialogHeader>
        <DialogHeader.Middle>
          <Text translation={'walletProvider.shapeShift.delete.header'} />
        </DialogHeader.Middle>
      </DialogHeader>
      <DialogBody>
        <Text mb={6} color='text.subtle' translation={walletTranslations} />
        <form onSubmit={handleFormSubmit}>
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
            colorScheme='red'
            size='lg'
            width='full'
            type='submit'
            isDisabled={isSubmitting || password?.length < MIN_PASSWORD_LENGTH}
            isLoading={isSubmitting}
          >
            <Text translation={'walletProvider.shapeShift.delete.confirmDelete'} />
          </Button>
        </form>
      </DialogBody>
    </>
  )
}
