import {
  Button,
  FormControl,
  FormErrorMessage,
  ModalBody,
  ModalHeader,
  Textarea
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import * as bip39 from 'bip39'
import { FieldValues, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Text } from 'components/Text'

export const NativeImport = () => {
  let navigate = useNavigate()
  const onSubmit = async (values: FieldValues) => {
    try {
      const vault = await Vault.create()
      vault.meta.set('createdAt', Date.now())
      vault.set('#mnemonic', values.mnemonic)
      navigate('/native/password', {state: { vault }})
    } catch (e) {
      setError('mnemonic', { type: 'manual', message: 'walletProvider.shapeShift.import.header' })
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
        <Text translation={'walletProvider.shapeShift.import.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='gray.500' mb={4} translation={'walletProvider.shapeShift.import.body'} />
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl isInvalid={errors.mnemonic} mb={6} mt={6}>
            <Textarea
              variant='filled'
              size="large"
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
          <Button colorScheme='blue' isFullWidth size="large" type='submit' isLoading={isSubmitting}>
            <Text translation={'walletProvider.shapeShift.import.button'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
