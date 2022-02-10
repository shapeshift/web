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
import { useTranslate } from 'react-polyglot'
import { RouteComponentProps } from 'react-router-dom'
import { Text } from 'components/Text'

export const NativeImport = ({ history }: RouteComponentProps) => {
  const onSubmit = async (values: FieldValues) => {
    try {
      const vault = await Vault.create()
      vault.meta.set('createdAt', Date.now())
      vault.set('#mnemonic', values.mnemonic)
      history.push('/native/password', { vault })
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

  const translate = useTranslate()

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
              size='lg'
              autoComplete='off'
              autoCorrect='off'
              {...register('mnemonic', {
                required: translate(
                  'walletProvider.shapeShift.import.secretRecoveryPhraseRequired'
                ),
                minLength: {
                  value: 47,
                  message: translate(
                    'walletProvider.shapeShift.import.secretRecoveryPhraseTooShort'
                  )
                },
                validate: {
                  validMnemonic: value =>
                    bip39.validateMnemonic(value) ||
                    translate('walletProvider.shapeShift.import.secretRecoveryPhraseError')
                }
              })}
              data-test='wallet-native-seed-input'
            />
            <FormErrorMessage data-test='wallet-native-seed-validation-message'>
              {errors.mnemonic?.message}
            </FormErrorMessage>
          </FormControl>
          <Button
            colorScheme='blue'
            isFullWidth
            size='lg'
            type='submit'
            isLoading={isSubmitting}
            data-test='wallet-native-seed-submit-button'
          >
            <Text translation={'walletProvider.shapeShift.import.button'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
