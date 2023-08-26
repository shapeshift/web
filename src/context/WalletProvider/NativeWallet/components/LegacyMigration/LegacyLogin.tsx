/*
 * This file is a shared component for both NativeWallet and MobileWallet
 */
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
import axios from 'axios'
import { getConfig } from 'config'
import { useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { FriendlyCaptcha } from 'context/WalletProvider/NativeWallet/components/LegacyMigration/Captcha'
import { getPasswordHash } from 'lib/cryptography/login'

import type { LoginResponseError, NativeWalletValues, RateLimitError } from './types'
import { LoginErrors } from './types'

export type OnLoginSuccess = (args: {
  encryptedWallet: string
  email: string
  password: string
}) => Promise<void>

type LegacyLoginProps = {
  onLoginSuccess: OnLoginSuccess
}

export const LegacyLogin: React.FC<LegacyLoginProps> = ({ onLoginSuccess }) => {
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
      // Callback to allow the wallet to save differently based on the platform
      await onLoginSuccess({
        encryptedWallet,
        email: values.email,
        password: values.password,
      })
      reset()
    } catch (err) {
      console.error(err)
      setError(false)
      setCaptchaSolution(null)
      if (isRateLimitError(err)) {
        setError(translate('walletProvider.shapeShift.legacy.tooManyAttempts'))
        return
      }
      if (isLoginError(err)) {
        if (
          err.response.status === LoginErrors.twoFactorRequired.httpCode &&
          err.response.data.error?.msg === LoginErrors.twoFactorRequired.msg
        ) {
          setTwoFactorRequired(true)
          return
        }

        if (
          err.response.status === LoginErrors.invalidCaptcha.httpCode &&
          err.response.data.error.msg === LoginErrors.invalidCaptcha.msg
        ) {
          setError(translate('walletProvider.shapeShift.legacy.invalidCaptcha'))
          return
        }

        if (
          err.response.status === LoginErrors.twoFactorInvalid.httpCode &&
          err.response.data.error.msg === LoginErrors.twoFactorInvalid.msg
        ) {
          setError(translate('walletProvider.shapeShift.legacy.invalidTwoFactor'))
          return
        }

        // Successful account login, but no ShapeShift Wallet for account.
        if (
          err.response.status === LoginErrors.noWallet.httpCode &&
          err.response.data.error.msg.startsWith(LoginErrors.noWallet.msg)
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
              color='text.subtle'
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
              color='text.subtle'
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
            isDisabled={!captchaSolution}
            colorScheme='blue'
            width='full'
            size='lg'
            type='submit'
            isLoading={isSubmitting}
            data-test={isTwoFactorRequired ? 'wallet-native-2fa' : 'wallet-native-login-import'}
          >
            <Text translation={isTwoFactorRequired ? 'common.verify' : 'common.login'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
