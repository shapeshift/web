import {
  Button,
  Checkbox,
  FormControl,
  FormErrorMessage,
  Input,
  ModalBody,
  ModalHeader,
  useColorModeValue,
} from '@chakra-ui/react'
import { FieldValues, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { RouteComponentProps } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { Text } from 'components/Text'

// @TODO(NeOMakinG): Remove this and add the 2fa code logic
const doubleAuthCode = ''

export const LegacyLogin = ({ history }: RouteComponentProps) => {
  const captchaBgColor = useColorModeValue('gray.50', 'gray.700')
  const checkboxBorderColor = useColorModeValue('gray.400', 'white')

  const onSubmit = async (values: FieldValues) => {
    return
  }

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm({ shouldUnregister: true })

  const translate = useTranslate()

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
          <FormControl isInvalid={errors.captcha} mb={4} mt={6}>
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
                  {...register('captcha', {
                    required: translate('walletProvider.shapeShift.legacy.invalidCaptcha'),
                  })}
                >
                  {translate('common.notRobot')}
                </Checkbox>
              </Card.Body>
            </Card>
            <FormErrorMessage>{errors.captcha?.message}</FormErrorMessage>
          </FormControl>
          <Input name='2fa' value={doubleAuthCode} type='hidden' />
          <Button
            colorScheme='blue'
            isFullWidth
            size='lg'
            type='submit'
            isLoading={isSubmitting}
            data-test='wallet-native-seed-submit-button'
          >
            <Text translation={'common.logIn'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
