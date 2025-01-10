import {
  Button,
  FormControl,
  FormErrorMessage,
  ModalBody,
  ModalHeader,
  Textarea,
} from '@chakra-ui/react'
import * as bip39 from 'bip39'
import { useCallback, useMemo } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { Text } from 'components/Text'
import { NativeWalletRoutes } from 'context/WalletProvider/types'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'

import type { NativeWalletValues } from '../types'

export const NativeImportSeed = ({ history }: RouteComponentProps) => {
  const mixpanel = getMixPanel()

  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<NativeWalletValues>({ shouldUnregister: true })

  const onSubmit = useCallback(
    async (values: FieldValues) => {
      try {
        const Vault = await import('@shapeshiftoss/hdwallet-native-vault').then(m => m.Vault)
        const vault = await Vault.create()
        vault.meta.set('createdAt', Date.now())
        vault.set('#mnemonic', values.mnemonic.toLowerCase().trim())
        history.push(NativeWalletRoutes.Password, { vault })
        mixpanel?.track(MixPanelEvent.NativeImportSeed)
      } catch (e) {
        setError('mnemonic', { type: 'manual', message: 'walletProvider.shapeShift.import.header' })
      }
    },
    [history, mixpanel, setError],
  )

  const translate = useTranslate()
  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  const seedInputProps = useMemo(
    () =>
      register('mnemonic', {
        required: translate('walletProvider.shapeShift.import.secretRecoveryPhraseRequired'),
        minLength: {
          value: 47,
          message: translate('walletProvider.shapeShift.import.secretRecoveryPhraseTooShort'),
        },
        validate: {
          validMnemonic: value =>
            bip39.validateMnemonic(value.toLowerCase().trim()) ||
            translate('walletProvider.shapeShift.import.secretRecoveryPhraseError'),
        },
      }),
    [register, translate],
  )
  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.import.header'} />
      </ModalHeader>
      <ModalBody>
        <Text color='text.subtle' mb={4} translation={'walletProvider.shapeShift.import.body'} />
        <form onSubmit={handleFormSubmit}>
          <FormControl isInvalid={Boolean(errors.mnemonic)} mb={6} mt={6}>
            <Textarea
              variant='filled'
              size='lg'
              autoComplete='off'
              autoCorrect='off'
              textTransform='lowercase'
              {...seedInputProps}
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
