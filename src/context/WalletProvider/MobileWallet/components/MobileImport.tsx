import {
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  ModalBody,
  ModalHeader,
  Textarea,
} from '@chakra-ui/react'
import * as bip39 from 'bip39'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { Text } from 'components/Text'

import { addWallet } from '../mobileMessageHandlers'

type FormValues = { mnemonic: string; name: string }

export const MobileImport = ({ history }: RouteComponentProps) => {
  const onSubmit = async (values: FormValues) => {
    try {
      // Save the wallet in the mobile app
      const vault = await addWallet({
        mnemonic: values.mnemonic.toLowerCase().trim(),
        label: values.name.trim(),
      })
      history.push('/mobile/success', { vault })
    } catch (e) {
      console.log(e)
      setError('mnemonic', { type: 'manual', message: 'walletProvider.shapeShift.import.header' })
    }
  }

  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ shouldUnregister: true })

  const translate = useTranslate()

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.import.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='text.subtle' mb={4} translation={'walletProvider.shapeShift.import.body'} />
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl isInvalid={Boolean(errors.mnemonic)} mb={6} mt={6}>
            <Textarea
              variant='filled'
              size='lg'
              autoComplete='off'
              autoCorrect='off'
              textTransform='lowercase'
              {...register('mnemonic', {
                required: translate(
                  'walletProvider.shapeShift.import.secretRecoveryPhraseRequired',
                ),
                minLength: {
                  value: 47,
                  message: translate(
                    'walletProvider.shapeShift.import.secretRecoveryPhraseTooShort',
                  ),
                },
                validate: {
                  validMnemonic: value =>
                    bip39.validateMnemonic(value.toLowerCase().trim()) ||
                    translate('walletProvider.shapeShift.import.secretRecoveryPhraseError'),
                },
              })}
              data-test='wallet-native-seed-input'
            />
            <FormErrorMessage data-test='wallet-native-seed-validation-message'>
              {errors.mnemonic?.message}
            </FormErrorMessage>
          </FormControl>
          <FormControl mb={6} isInvalid={Boolean(errors.name)}>
            <Input
              {...register('name', {
                required: translate('modals.shapeShift.password.error.walletNameRequired'),
                maxLength: {
                  value: 64,
                  message: translate('modals.shapeShift.password.error.maxLength', { length: 64 }),
                },
              })}
              size='lg'
              variant='filled'
              id='name'
              placeholder={translate('walletProvider.shapeShift.rename.walletName')}
            />
            <FormErrorMessage>{errors?.name?.message}</FormErrorMessage>
          </FormControl>
          <Button
            colorScheme='blue'
            width='full'
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
