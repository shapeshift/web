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
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useMemo, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { createRevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import { useWallet } from '@/hooks/useWallet/useWallet'

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
  } = useForm<{ password: string }>({ mode: 'onChange' })

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
          value: 8,
          message: translate('modals.shapeShift.password.error.length', { length: 8 }),
        },
      }),
    [register, translate],
  )

  const walletTranslations: [string, number | InterpolationOptions] = useMemo(() => {
    return ['walletProvider.shapeShift.delete.body', { name: state.walletInfo?.meta?.label }]
  }, [state.walletInfo?.meta?.label])

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.delete.header'} />
      </ModalHeader>
      <ModalBody>
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
          <Button colorScheme='red' size='lg' width='full' type='submit' isLoading={isSubmitting}>
            <Text translation={'walletProvider.shapeShift.delete.confirmDelete'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
