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
import { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

// @TODO(NeOMakinG): Remove this and add the 2fa code logic
const twoFactorAuthCode = ''

export const LegacyLogin = () => {
  const [isCaptchaSolved, setIsCaptchaSolved] = useState(false)
  const [error, setError] = useState<boolean | string>(false)
  const captchaBgColor = useColorModeValue('gray.50', 'gray.700')
  const checkboxBorderColor = useColorModeValue('gray.400', 'white')

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ shouldUnregister: true })

  const translate = useTranslate()

  const onSubmit = async (values: FieldValues) => {
    // @TODO(NeOMakinG): Remove this when we handle the error response from the API
    if (true) {
      setError(translate('walletProvider.shapeShift.legacy.invalidLogin'))
    } else {
      // Reset every fields in order to remove the password and email from the memory
      reset()
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
