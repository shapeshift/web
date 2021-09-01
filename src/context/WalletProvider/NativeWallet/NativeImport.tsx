import {
  Button,
  FormControl,
  FormErrorMessage,
  ModalBody,
  ModalHeader,
  Textarea
} from '@chakra-ui/react'
import * as bip39 from 'bip39'
import { RawText } from 'components/Text'
import { FieldValues, useForm } from 'react-hook-form'

import { NativeSetupProps } from './setup'

export const NativeImport = ({ history, location }: NativeSetupProps) => {
  const onSubmit = async (values: FieldValues) => {
    const encryptedWallet = await location.state.encryptedWallet?.createWallet(values.mnemonic)
    if (encryptedWallet?.encryptedWallet) {
      history.push('/native/success', { encryptedWallet: location.state.encryptedWallet })
    }
  }

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting }
  } = useForm()

  return (
    <>
      <ModalHeader>Import your wallet</ModalHeader>
      <ModalBody>
        <RawText mb={4}>Enter your 12 word seed phrase to import an exisiting wallet</RawText>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl isInvalid={errors.mnemonic} mb={6} mt={6}>
            <Textarea
              variant='filled'
              size='lg'
              autoComplete='off'
              autoCorrect='off'
              {...register('mnemonic', {
                required: 'Seed phrase is required',
                minLength: { value: 47, message: 'Seed phrase is too short' },
                validate: {
                  validMnemonic: value => bip39.validateMnemonic(value) || 'Invalid seed phrase'
                }
              })}
            />
            <FormErrorMessage>{errors.mnemonic?.message}</FormErrorMessage>
          </FormControl>
          <Button colorScheme='blue' isFullWidth size='lg' type='submit' isLoading={isSubmitting}>
            Next
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
