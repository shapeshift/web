import {
  Alert,
  AlertIcon,
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
const DUMMY_MNEMONIC = 'yolo yolo yolo yolo yolo yolo yolo yolo yolo yolo yolo yolo2'

export const LegacyLogin = () => {
  const history = useHistory()
  const [isCaptchaSolved, setIsCaptchaSolved] = useState(false)
  const [error, setError] = useState<boolean | string>(false)
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
      await new Promise((resolve, reject) => resolve(null))
      // TODO: use response to create wallet vault.
      const vault = await Vault.create(undefined, false)
      vault.meta.set('createdAt', Date.now())
      vault.set('#mnemonic', DUMMY_MNEMONIC)
      history.push('/native/legacy/login/success', { vault })
    } catch (err) {
      if (isLoginError(err) && err.message === '2fa required') {
        history.push('/native/legacy/two-factor')
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
        <Text translation={'walletProvider.shapeShift.legacy.loginWithAccount'} />
      </ModalHeader>
      <ModalBody pt={0}>
        <Text
          color='gray.500'
          mb={4}
          translation={'walletProvider.shapeShift.legacy.loginInformations'}
        />
        <form onSubmit={handleSubmit(onSubmit)}>
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
            <FormErrorMessage>{errors.captcha?.message}</FormErrorMessage>
          </FormControl>

          {error && (
            <Alert status='error' my={4}>
              <AlertIcon />
              {error}
            </Alert>
          )}

          <Input name='2fa' value={twoFactorAuthCode} type='hidden' />
          <Button colorScheme='blue' isFullWidth size='lg' type='submit' isLoading={isSubmitting}>
            <Text translation={'common.login'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
