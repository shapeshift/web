import {
  Button,
  FormControl,
  FormErrorMessage,
  ModalBody,
  ModalHeader,
  Textarea,
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import * as bip39 from 'bip39'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { Text } from 'components/Text'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'

import type { NativeWalletValues } from '../types'

export const NativeImport = ({ history }: RouteComponentProps) => {
  const mixpanel = getMixPanel()
  const onSubmit = async (values: FieldValues) => {
    try {
      const vault = await Vault.create()
      vault.meta.set('createdAt', Date.now())
      vault.set('#mnemonic', values.mnemonic.toLowerCase().trim())
      history.push('/native/password', { vault })
      mixpanel?.track(MixPanelEvents.NativeImport)
    } catch (e) {
      setError('mnemonic', { type: 'manual', message: 'walletProvider.shapeShift.import.header' })
    }
  }

  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<NativeWalletValues>({ shouldUnregister: true })

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
