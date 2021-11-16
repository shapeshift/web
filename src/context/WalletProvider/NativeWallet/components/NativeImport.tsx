import {
  Button,
  FormControl,
  FormErrorMessage,
  ModalBody,
  ModalHeader,
  Textarea
} from '@chakra-ui/react'
import * as bip39 from 'bip39'
import { FieldValues, useForm } from 'react-hook-form'
import { Text } from 'components/Text'

import { NativeSetupProps } from '../types'

export const NativeImport = ({ history, location }: NativeSetupProps) => {
  const onSubmit = async (values: FieldValues) => {
    const vault = location.state.vault
    if (vault) {
      if (vault.has('#mnemonic')) {
        throw new Error(
          "you're about to overwrite your mnemonic, and you probably don't want to do that"
        )
      }
      vault.set('#mnemonic', values.mnemonic)
      await vault.save()
      history.push('/native/success', { vault })
    }
  }

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting }
  } = useForm()

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.nativeImport.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={4} translation={'walletProvider.shapeShift.nativeImport.body'} />
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
            <Text translation={'walletProvider.shapeShift.nativeImport.button'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
