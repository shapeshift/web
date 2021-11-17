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
import { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { Text } from 'components/Text'

import { NativeSetupProps } from '../types'

export const NativePassword = ({ history, location }: NativeSetupProps) => {
  const [showPw, setShowPw] = useState<boolean>(false)

  const handleShowClick = () => setShowPw(!showPw)
  const onSubmit = async (values: FieldValues) => {
    try {
      const vault = location.state.vault
      vault.seal()
      await vault.setPassword(values.password)
      history.push('/native/success', { vault })
    } catch (e) {
      console.error('WalletProvider:NativeWallet:Password - Error setting password', e)
      setError('password', { type: 'manual', message: 'walletProvider.shapeShift.password.error' })
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
          <FormControl isInvalid={errors.name} mb={6}>
            <InputGroup size='lg' variant='filled'>
              <Input
                {...register('password', {
                  required: 'This is required',
                  minLength: { value: 8, message: 'Minimum length should be 8' }
                })}
                pr='4.5rem'
                type={showPw ? 'text' : 'password'}
                placeholder='Enter password'
                id='password'
              />
              <InputRightElement>
                <IconButton
                  aria-label={!showPw ? 'Show password' : 'Hide password'}
                  h='1.75rem'
                  size='sm'
                  onClick={handleShowClick}
                  icon={!showPw ? <FaEye /> : <FaEyeSlash />}
                />
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>{errors.name && errors.name.message}</FormErrorMessage>
          </FormControl>
          <Button colorScheme='blue' size='lg' isFullWidth type='submit' isLoading={isSubmitting}>
            <Text translation={'walletProvider.shapeShift.password.button'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
