import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  ModalBody,
  ModalHeader,
  useColorModeValue,
} from '@chakra-ui/react'
import { useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'

import type { NativeSetupProps, NativeWalletValues } from '../types'

export const NativePassword = ({ history, location }: NativeSetupProps) => {
  const translate = useTranslate()
  const [showPw, setShowPw] = useState<boolean>(false)
  const [showConfirmPw, setShowConfirmPw] = useState<boolean>(false)

  const handleShowPwClick = () => setShowPw(!showPw)
  const handleShowConfirmPwClick = () => setShowConfirmPw(state => !state)
  const onSubmit = async (values: FieldValues) => {
    try {
      const vault = location.state.vault
      vault.seal()
      await vault.setPassword(values.password)
      vault.meta.set('name', values.name)
      history.push('/native/success', { vault })
    } catch (e) {
      console.error(e)
      setError('password', {
        type: 'manual',
        message: translate('modal.shapeShift.password.error.invalid'),
      })
    }
  }

  const {
    setError,
    handleSubmit,
    register,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NativeWalletValues>({ mode: 'onChange', shouldUnregister: true })

  const watchPassword = watch('password')

  const warningColor = useColorModeValue('yellow.500', 'yellow.200')
  const warningBackgroundColor = '#FAF08933'

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.password.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={4} color='text.subtle' translation={'walletProvider.shapeShift.password.body'} />
        <Alert
          mb={4}
          status='warning'
          color={warningColor}
          backgroundColor={warningBackgroundColor}
          fontSize='md'
          fontWeight='normal'
        >
          <AlertIcon color={warningColor} />
          <Text fontWeight='bold' translation={'walletProvider.shapeShift.password.warning'} />
        </Alert>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl mb={6} isInvalid={Boolean(errors.name)}>
            <Input
              {...register('name', {
                maxLength: {
                  value: 64,
                  message: translate('modals.shapeShift.password.error.maxLength', { length: 64 }),
                },
              })}
              size='lg'
              variant='filled'
              id='name'
              placeholder={translate('modals.shapeShift.password.walletName')}
              data-test='wallet-native-set-name-input'
            />
            <FormErrorMessage>{errors?.name?.message}</FormErrorMessage>
          </FormControl>
          <FormControl mb={6} isInvalid={Boolean(errors.password)}>
            <InputGroup size='lg' variant='filled'>
              <Input
                {...register('password', {
                  required: translate('modals.shapeShift.password.error.required'),
                  minLength: {
                    value: 8,
                    message: translate('modals.shapeShift.password.error.length', { length: 8 }),
                  },
                })}
                pr='4.5rem'
                type={showPw ? 'text' : 'password'}
                placeholder={translate('modals.shapeShift.password.placeholder')}
                autoComplete={'password'}
                id='password'
                data-test='wallet-native-password-input'
              />
              <InputRightElement>
                <IconButton
                  aria-label={translate(`modals.shapeShift.password.${showPw ? 'hide' : 'show'}`)}
                  h='1.75rem'
                  size='sm'
                  tabIndex={-1}
                  onClick={handleShowPwClick}
                  icon={!showPw ? <FaEye /> : <FaEyeSlash />}
                />
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>{errors?.password?.message}</FormErrorMessage>
          </FormControl>
          <FormControl mb={6} isInvalid={Boolean(errors.confirmPassword)}>
            <InputGroup size='lg' variant='filled'>
              <Input
                {...register('confirmPassword', {
                  required: translate('modals.shapeShift.confirmPassword.error.required'),
                  validate: value =>
                    value === watchPassword ||
                    translate('modals.shapeShift.confirmPassword.error.invalid'),
                })}
                pr='4.5rem'
                type={showConfirmPw ? 'text' : 'password'}
                placeholder={translate('modals.shapeShift.confirmPassword.placeholder')}
                autoComplete={'confirmPassword'}
                id='confirmPassword'
                data-test='wallet-native-confirmPassword-input'
              />
              <InputRightElement>
                <IconButton
                  aria-label={translate(
                    `modals.shapeShift.confirmPassword.${showConfirmPw ? 'hide' : 'show'}`,
                  )}
                  h='1.75rem'
                  size='sm'
                  tabIndex={-1}
                  onClick={handleShowConfirmPwClick}
                  icon={!showConfirmPw ? <FaEye /> : <FaEyeSlash />}
                />
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>{errors?.confirmPassword?.message}</FormErrorMessage>
          </FormControl>
          <Button
            colorScheme='blue'
            size='lg'
            width='full'
            type='submit'
            isLoading={isSubmitting}
            isDisabled={Boolean(errors.name || errors.password || errors.confirmPassword)}
            data-test='wallet-native-password-submit-button'
          >
            <Text translation={'walletProvider.shapeShift.password.button'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
