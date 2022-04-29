import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormErrorMessage,
  Input,
  ModalBody,
  ModalHeader,
  useColorModeValue,
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import axios from 'axios'
import { getConfig } from 'config'
import { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'
import { decryptNativeWallet, getPasswordHash } from 'lib/cryptography/login'

import { loginErrors, LoginResponseError } from '../types'

export const LegacyLogin = () => {
  const history = useHistory()
  const [isCaptchaSolved, setIsCaptchaSolved] = useState(false)
  const [error, setError] = useState<boolean | string>(false)
  const [isTwoFactorRequired, setTwoFactorRequired] = useState(false)
  const captchaBgColor = useColorModeValue('gray.50', 'gray.700')
  const checkboxBorderColor = useColorModeValue('gray.400', 'white')

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ shouldUnregister: true })

  const translate = useTranslate()

  const isLoginError = (err: any): err is LoginResponseError =>
    typeof err?.response?.data?.error?.msg === 'string' && typeof err.response.status === 'number'

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
      if (isLoginError(err)) {
        if (
          err.response.status === loginErrors.twoFactorRequired.httpCode &&
          err.response.data.error.msg === loginErrors.twoFactorRequired.msg
        ) {
          setTwoFactorRequired(true)
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

  const onCaptchaRequested = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check the captcha in case the captcha has been validated
    setIsCaptchaSolved(e.target.checked)
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
            <FormControl isInvalid={errors.email} mb={4}>
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
            <FormControl isInvalid={errors.password}>
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
            <FormControl isInvalid={errors.captchaChallenge && !isCaptchaSolved} mb={4} mt={6}>
              <Card
                size='sm'
                width='full'
                variant='group'
                p={2}
                border={0}
                background={captchaBgColor}
              >
                <Card.Body p={2}>
                  <Checkbox
                    borderColor={checkboxBorderColor}
                    spacing={'0.75rem'}
                    // @TODO(NeOMakinG): Change this to use a real captcha
                    {...register('captchaChallenge', {
                      required: translate('walletProvider.shapeShift.legacy.invalidCaptcha'),
                    })}
                    onChange={onCaptchaRequested}
                    isChecked={isCaptchaSolved}
                  >
                    {translate('common.notRobot')}
                  </Checkbox>
                </Card.Body>
              </Card>
              <FormErrorMessage>{errors.captchaChallenge?.message}</FormErrorMessage>
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
          </Box>

          {error && (
            <Alert status='error' my={4}>
              <AlertIcon />
              {error}
            </Alert>
          )}

          <Button colorScheme='blue' isFullWidth size='lg' type='submit' isLoading={isSubmitting}>
            <Text translation={isTwoFactorRequired ? 'common.verify' : 'common.login'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
