import {
  Button,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  ModalBody,
  ModalHeader
} from '@chakra-ui/react'
import React, { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'

import { NativeSetupProps } from '../types'

export const NativePassword = ({ history, location }: NativeSetupProps) => {
  const translate = useTranslate()
  const [showPw, setShowPw] = useState<boolean>(false)

  const handleShowClick = () => setShowPw(!showPw)
  const onSubmit = async (values: FieldValues) => {
    try {
      const vault = location.state.vault
      vault.seal()
      await vault.setPassword(values.password)
      vault.meta.set('name', values.name)
      history.push('/native/success', { vault })
    } catch (e) {
      console.error('WalletProvider:NativeWallet:Password - Error setting password', e)
      setError('password', {
        type: 'manual',
        message: translate('modal.shapeShift.password.error.invalid')
      })
    }
  }

  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting }
  } = useForm({ mode: 'onChange' })

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.password.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='gray.500' translation={'walletProvider.shapeShift.password.body'} />
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl mb={6} isInvalid={errors.name}>
            <Input
              {...register('name', {
                maxLength: {
                  value: 64,
                  message: translate('modals.shapeShift.password.error.maxLength', { length: 64 })
                }
              })}
              size='lg'
              variant='filled'
              id='name'
              placeholder={translate('modals.shapeShift.password.walletName')}
              data-test='wallet-native-set-name-input'
            />
            <FormErrorMessage>{errors?.name?.message}</FormErrorMessage>
          </FormControl>
          <FormControl mb={6} isInvalid={errors.password}>
            <InputGroup size='lg' variant='filled'>
              <Input
                {...register('password', {
                  required: translate('modals.shapeShift.password.error.required'),
                  minLength: {
                    value: 8,
                    message: translate('modals.shapeShift.password.error.length', { length: 8 })
                  }
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
                  onClick={handleShowClick}
                  icon={!showPw ? <FaEye /> : <FaEyeSlash />}
                />
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>{errors?.password?.message}</FormErrorMessage>
          </FormControl>
          <Button
            colorScheme='blue'
            size='lg'
            isFullWidth
            type='submit'
            isLoading={isSubmitting}
            isDisabled={errors.name}
            data-test='wallet-native-password-submit-button'
          >
            <Text translation={'walletProvider.shapeShift.password.button'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
