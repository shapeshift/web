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
import * as bip39 from 'bip39'
import { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

import { LoginError } from '../types'

// @TODO(NeOMakinG): Remove this and add the 2fa code logic
const twoFactorAuthCode = ''

// @TODO(NeOMakinG): Change this with the mnemonic of the legacy account
const DUMMY_MNEMONIC =
  'yawning yodellers yielded yearningly yet yodeling yeti yelped yearningly yet youths yawned'

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
  } = useForm({ shouldUnregister: true })

  const translate = useTranslate()

  const isLoginError = (err: any): err is LoginError => err && typeof err.message === 'string'

  const onSubmit = async (values: FieldValues) => {
    try {
      // @TODO: Replace this with API call when backend is ready
      const { mnemonic } = await Promise.resolve({ mnemonic: DUMMY_MNEMONIC })

      if (!bip39.validateMnemonic(mnemonic)) {
        // @TODO: Should we send an error to the user?
      }

      // TODO: use response to create wallet vault.
      const vault = await Vault.create(undefined, false)
      vault.meta.set('createdAt', Date.now())
      vault.set('#mnemonic', mnemonic)
      history.push('/native/legacy/login/success', { vault })
    } catch (err) {
      if (isLoginError(err) && err.message === '2fa required') {
        setTwoFactorRequired(true)

        return
      }

      if (isLoginError(err) && err.message === '2fa invalid') {
        setError(translate('walletProvider.shapeShift.legacy.invalidTwoFactor'))

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

          <Input name='2fa' value={twoFactorAuthCode} type='hidden' />
          <Button colorScheme='blue' isFullWidth size='lg' type='submit' isLoading={isSubmitting}>
            <Text translation={isTwoFactorRequired ? 'common.verify' : 'common.login'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
