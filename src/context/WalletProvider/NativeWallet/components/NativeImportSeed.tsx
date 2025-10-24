import { Button, FormControl, FormErrorMessage, Textarea } from '@chakra-ui/react'
import * as bip39 from 'bip39'
import { useCallback, useMemo } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { NativeWalletValues } from '../types'

import { DialogBody } from '@/components/Modal/components/DialogBody'
import { Text } from '@/components/Text'
import { NativeWalletRoutes } from '@/context/WalletProvider/types'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'

export const NativeImportSeed = () => {
  const navigate = useNavigate()
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
        navigate(NativeWalletRoutes.Password, { state: { vault } })
        mixpanel?.track(MixPanelEvent.NativeImportSeed)
      } catch (e) {
        setError('mnemonic', { type: 'manual', message: 'walletProvider.shapeShift.import.header' })
      }
    },
    [navigate, mixpanel, setError],
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
      <DialogBody>
        <Text fontWeight='bold' mb={6} translation={'walletProvider.shapeShift.import.header'} />
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
      </DialogBody>
    </>
  )
}
