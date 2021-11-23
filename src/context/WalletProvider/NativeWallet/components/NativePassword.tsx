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
  } = useForm()

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.password.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='gray.500' translation={'walletProvider.shapeShift.password.body'} />
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl mb={6}>
            <Input
              {...register('name')}
              size='lg'
              variant='filled'
              id='name'
              placeholder={translate('modals.shapeShift.password.walletName')}
            />
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
          <Button colorScheme='blue' size='lg' isFullWidth type='submit' isLoading={isSubmitting}>
            <Text translation={'walletProvider.shapeShift.password.button'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
