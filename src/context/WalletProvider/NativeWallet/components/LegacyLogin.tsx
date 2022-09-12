import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import axios from 'axios'
import { getConfig } from 'config'
import { useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Text } from 'components/Text'
import { decryptNativeWallet, getPasswordHash } from 'lib/cryptography/login'

import type { LoginResponseError, NativeWalletValues, RateLimitError } from '../types'
import { loginErrors } from '../types'
import { FriendlyCaptcha } from './Captcha'

export const LegacyLogin = () => {
  const history = useHistory()
  const [error, setError] = useState<boolean | string>(false)
  const [isTwoFactorRequired, setTwoFactorRequired] = useState(false)
  const [captchaSolution, setCaptchaSolution] = useState<string | null>(null)

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NativeWalletValues>({ shouldUnregister: true })

  const translate = useTranslate()

  const isLoginError = (err: any): err is LoginResponseError =>
    typeof err?.response?.data?.error?.msg === 'string' && typeof err.response.status === 'number'

  const isRateLimitError = (err: any): err is RateLimitError =>
    typeof err?.response?.data === 'string' && err?.response?.status === 429

  const isDecryptionError = (err: any): err is Error =>
    typeof err?.message === 'string' && err.message.startsWith('Native wallet decryption failed')

  type LoginResponse = {
    success: boolean
    data: string
    error: any
  }

  const MIGRATE_URL = getConfig().REACT_APP_WALLET_MIGRATION_URL

  const onSubmit = async (values: FieldValues) => {
    try {
      const hashedPassword = await getPasswordHash(values.email, values.password)
      const { data: response } = await axios.post<LoginResponse>(MIGRATE_URL, {
        email: values.email,
        password: hashedPassword,
        twoFactorCode: values.twoFactorCode || undefined,
        captchaSolution,
      })
      const { data: encryptedWallet } = response
      const vault = await Vault.create(undefined, false)
      vault.meta.set('createdAt', Date.now())
      vault.set(
        '#mnemonic',
        await decryptNativeWallet(values.email, values.password, encryptedWallet),
      )
      history.push('/native/legacy/login/success', { vault })
      // Clear the form state on success.
      reset()
    } catch (err) {
      setError(false)
      setCaptchaSolution(null)
      if (isRateLimitError(err)) {
        setError(translate('walletProvider.shapeShift.legacy.tooManyAttempts'))
        return
      }
      if (isLoginError(err)) {
        if (
          err.response.status === loginErrors.twoFactorRequired.httpCode &&
          err.response.data.error?.msg === loginErrors.twoFactorRequired.msg
        ) {
          setTwoFactorRequired(true)
          return
        }

        if (
          err.response.status === loginErrors.invalidCaptcha.httpCode &&
          err.response.data.error.msg === loginErrors.invalidCaptcha.msg
        ) {
          setError(translate('walletProvider.shapeShift.legacy.invalidCaptcha'))
          return
        }

        if (
          err.response.status === loginErrors.twoFactorInvalid.httpCode &&
          err.response.data.error.msg === loginErrors.twoFactorInvalid.msg
        ) {
          setError(translate('walletProvider.shapeShift.legacy.invalidTwoFactor'))
          return
        }

        // Successful account login, but no Native Wallet for account.
        if (
          err.response.status === loginErrors.noWallet.httpCode &&
          err.response.data.error.msg.startsWith(loginErrors.noWallet.msg)
        ) {
          setError(translate('walletProvider.shapeShift.legacy.noWallet'))
          return
        }
      }

      if (isDecryptionError(err)) {
        setError(translate('walletProvider.shapeShift.legacy.decryptionError'))
        return
      }

      setError(translate('walletProvider.shapeShift.legacy.invalidLogin'))
    }
  }

  return (
    <>
      <ModalHeader>
        <Text
          translation={
            isTwoFactorRequired
              ? 'walletProvider.shapeShift.legacy.twoFactorAuthentication'
              : 'walletProvider.shapeShift.legacy.loginWithAccount'
          }
        />
      </ModalHeader>
      <ModalBody pt={0}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box display={!isTwoFactorRequired ? 'block' : 'none'}>
            <Text
              color='gray.500'
              mb={4}
              translation={'walletProvider.shapeShift.legacy.loginInformations'}
            />
            <FormControl isInvalid={Boolean(errors.email)} mb={4}>
              <Input
                {...register('email', {
                  pattern: {
                    value: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/i,
                    message: translate('walletProvider.shapeShift.legacy.invalidEmail'),
                  },
                  required: translate('walletProvider.shapeShift.legacy.emailRequired'),
                })}
                type='text'
                placeholder={translate('walletProvider.shapeShift.legacy.emailAddress')}
                variant='filled'
                height={12}
              />
              <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={Boolean(errors.password)}>
              <Input
                {...register('password', {
                  required: translate('modals.shapeShift.password.error.required'),
                })}
                type='password'
                placeholder={translate('walletProvider.shapeShift.legacy.password')}
                variant='filled'
                autoComplete='off'
                height={12}
              />
              <FormErrorMessage>{errors.password?.message}</FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={!captchaSolution} my={6}>
              <FriendlyCaptcha handleCaptcha={setCaptchaSolution} solution={captchaSolution} />
              <FormErrorMessage>
                {translate('walletProvider.shapeShift.legacy.captchaRequired')}
              </FormErrorMessage>
            </FormControl>
          </Box>

          <Box display={isTwoFactorRequired ? 'block' : 'none'}>
            <Text
              color='gray.500'
              mb={4}
              translation={'walletProvider.shapeShift.legacy.twoFactorDescription'}
            />
            <FormControl isInvalid={errors.twoFactorCode && isTwoFactorRequired} mb={4}>
              <Input
                {...register('twoFactorCode', {
                  pattern: {
                    value: /^[0-9]{6}$/i,
                    message: translate('walletProvider.shapeShift.legacy.invalidTwoFactor'),
                  },
                  required: {
                    value: isTwoFactorRequired,
                    message: translate('walletProvider.shapeShift.legacy.twoFactorRequired'),
                  },
                })}
                type='text'
                placeholder={translate('walletProvider.shapeShift.legacy.twoFactorPlaceholder')}
                variant='filled'
                height={12}
              />
              <FormErrorMessage>{errors.twoFactorCode?.message}</FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={!captchaSolution} my={6}>
              <FriendlyCaptcha handleCaptcha={setCaptchaSolution} solution={captchaSolution} />
              <FormErrorMessage>
                {translate('walletProvider.shapeShift.legacy.captchaRequired')}
              </FormErrorMessage>
            </FormControl>
          </Box>

          {error && (
            <Alert status='error' my={4}>
              <AlertIcon />
              {error}
            </Alert>
          )}

          <Button
            disabled={!captchaSolution}
            colorScheme='blue'
            width='full'
            size='lg'
            type='submit'
            isLoading={isSubmitting}
          >
            <Text translation={isTwoFactorRequired ? 'common.verify' : 'common.login'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
