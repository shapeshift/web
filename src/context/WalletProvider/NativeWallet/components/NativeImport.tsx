import {
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  ModalBody,
  ModalHeader,
  Stack,
  Textarea,
} from '@chakra-ui/react'
import * as bip39 from 'bip39'
import { useCallback, useMemo, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { RouteComponentProps } from 'react-router-dom'
import { Text } from 'components/Text'
import { NativeWalletRoutes } from 'context/WalletProvider/types'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'

import type { NativeWalletValues } from '../types'

export const NativeImport = ({ history }: RouteComponentProps) => {
  const [isKeystoreMode, setIsKeystoreMode] = useState(false)
  const [keystoreFile, setKeystoreFile] = useState<string | null>(null)
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
        const { Vault } = await import('@shapeshiftoss/hdwallet-native-vault')
        const vault = await Vault.create()
        vault.meta.set('createdAt', Date.now())

        if (isKeystoreMode) {
          if (!keystoreFile) {
            setError('keystorePassword', { type: 'manual', message: 'No keystore file selected' })
            return
          }

          try {
            debugger
            await vault.loadFromKeystore(keystoreFile, values.keystorePassword)
          } catch (e) {
            setError('keystorePassword', {
              type: 'manual',
              message: 'Invalid keystore or password',
            })
            return
          }
        } else {
          vault.set('#mnemonic', values.mnemonic.toLowerCase().trim())
        }

        history.push(NativeWalletRoutes.Password, { vault })
        mixpanel?.track(MixPanelEvent.NativeImport)
      } catch (e) {
        setError('mnemonic', { type: 'manual', message: 'walletProvider.shapeShift.import.header' })
      }
    },
    [history, isKeystoreMode, keystoreFile, mixpanel, setError],
  )

  const handleKeystoreUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return

    const file = event.target.files[0]
    const reader = new FileReader()
    reader.onload = e => {
      if (!e?.target) return
      if (typeof e.target.result !== 'string') return
      setKeystoreFile(e.target.result)
    }
    reader.readAsText(file)
  }

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
        <Text color='text.subtle' mb={4} translation='walletProvider.shapeShift.import.body' />

        <Stack spacing={4}>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setIsKeystoreMode(!isKeystoreMode)}
            data-test='wallet-native-toggle-mode'
          >
            <Text translation={isKeystoreMode ? 'Mnnemonic Input' : 'Keystore File Upload'} />
          </Button>

          {isKeystoreMode ? (
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormControl mb={4}>
                <Input
                  type='file'
                  accept='.txt,.json'
                  onChange={handleKeystoreUpload}
                  data-test='wallet-native-keystore-upload'
                />
              </FormControl>
              {/* TODO(gomes): Add keystore password validation */}
              <FormControl isInvalid={Boolean(false)} mb={4}>
                <Input
                  type='password'
                  placeholder='Keystore Password'
                  {...register('keystorePassword', {
                    required: translate(
                      'walletProvider.shapeShift.import.keystorePasswordRequired',
                    ),
                  })}
                  data-test='wallet-native-keystore-password'
                />
                <FormErrorMessage>{errors.keystorePassword?.message}</FormErrorMessage>
              </FormControl>
              <Button
                colorScheme='blue'
                width='full'
                size='lg'
                type='submit'
                isLoading={isSubmitting}
                data-test='wallet-native-keystore-submit'
              >
                <Text translation='Import Keystore' />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormControl isInvalid={Boolean(errors.mnemonic)} mb={6}>
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
                data-test='wallet-native-seed-submit'
              >
                <Text translation='walletProvider.shapeShift.import.button' />
              </Button>
            </form>
          )}
        </Stack>
      </ModalBody>{' '}
    </>
  )
}
