import { Button, FormControl, FormErrorMessage, Input, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import type { NativeWalletValues } from '../types'

import { FileUpload } from '@/components/FileUpload/FileUpload'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { Text } from '@/components/Text'
import { NativeWalletRoutes } from '@/context/WalletProvider/types'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'

export const NativeImportKeystore = () => {
  const [keystoreFile, setKeystoreFile] = useState<string | null>(null)
  const navigate = useNavigate()
  const mixpanel = getMixPanel()

  const translate = useTranslate()

  const {
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
    register,
  } = useForm<NativeWalletValues>({ shouldUnregister: true })

  const onSubmit = useCallback(
    async (values: FieldValues) => {
      const { Vault } = await import('@shapeshiftoss/hdwallet-native-vault')
      const vault = await Vault.create()
      vault.meta.set('createdAt', Date.now())

      if (!keystoreFile) {
        throw new Error('No keystore uploaded')
      }

      try {
        await vault.loadFromKeystore(keystoreFile, values.keystorePassword)
      } catch (e) {
        setError('keystorePassword', {
          type: 'manual',
          message: translate('walletProvider.shapeShift.import.invalidKeystorePassword'),
        })
        return
      }

      navigate(NativeWalletRoutes.Password, { state: { vault } })
      mixpanel?.track(MixPanelEvent.NativeImportKeystore)
    },
    [navigate, keystoreFile, mixpanel, setError, translate],
  )

  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      if (!e?.target) return
      if (typeof e.target.result !== 'string') return
      setKeystoreFile(e.target.result)
    }
    reader.readAsText(file)
  }, [])

  return (
    <>
      <DialogBody>
        <Text
          fontWeight='bold'
          mb={6}
          translation={'walletProvider.shapeShift.import.keystoreHeader'}
        />
        <Text
          color='text.subtle'
          mb={4}
          translation='walletProvider.shapeShift.import.keystoreImportBody'
        />

        <form onSubmit={handleSubmit(onSubmit)}>
          <VStack spacing={6}>
            <FileUpload onFileSelect={handleFileSelect} />

            {keystoreFile && (
              <>
                <FormControl isInvalid={Boolean(errors.keystorePassword)}>
                  <Input
                    type='password'
                    placeholder='Keystore Password'
                    size='lg'
                    data-test='wallet-native-keystore-password'
                    {...register('keystorePassword')}
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
                  <Text translation='walletProvider.shapeShift.import.importKeystore' />
                </Button>
              </>
            )}
          </VStack>
        </form>
      </DialogBody>
    </>
  )
}
