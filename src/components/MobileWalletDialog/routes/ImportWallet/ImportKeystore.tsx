import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  Text as CText,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import type { FieldValues } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { MobileWalletDialogRoutes } from 'components/MobileWalletDialog/types'
import { DialogBackButton } from 'components/Modal/components/DialogBackButton'
import { DialogBody } from 'components/Modal/components/DialogBody'
import { DialogCloseButton } from 'components/Modal/components/DialogCloseButton'
import { DialogFooter } from 'components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderRight,
} from 'components/Modal/components/DialogHeader'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { addWallet } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'
import { FileUpload } from 'context/WalletProvider/NativeWallet/components/NativeImportKeystore'
import type { NativeWalletValues } from 'context/WalletProvider/NativeWallet/types'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'

export const ImportKeystore = () => {
  const history = useHistory()
  const [keystoreFile, setKeystoreFile] = useState<string | null>(null)
  const mixpanel = getMixPanel()

  const translate = useTranslate()

  const {
    setError,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    register,
  } = useForm<NativeWalletValues>({
    mode: 'onChange',
    shouldUnregister: true,
  })

  const onSubmit = useCallback(
    async (values: FieldValues) => {
      const { Vault } = await import('@shapeshiftoss/hdwallet-native-vault')
      const vault = await Vault.create(undefined, false)
      vault.meta.set('createdAt', Date.now())

      if (!keystoreFile) {
        throw new Error('No keystore uploaded')
      }

      try {
        await vault.loadFromKeystore(keystoreFile, values.keystorePassword)
      } catch (e) {
        alert(e)
        setError('keystorePassword', {
          type: 'manual',
          message: translate('walletProvider.shapeShift.import.invalidKeystorePassword'),
        })
        return
      }

      try {
        const mnemonic = await vault.unwrap().get('#mnemonic')

        const revocableVault = await addWallet({
          mnemonic,
          label: values.name.trim(),
        })

        vault.revoke()
        history.push(MobileWalletDialogRoutes.ImportSuccess, { vault: revocableVault })
        mixpanel?.track(MixPanelEvent.NativeImportKeystore)
      } catch (e) {
        alert(e)
      }
    },
    [history, keystoreFile, mixpanel, setError, translate],
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

  const handleGoBack = useCallback(() => {
    history.goBack()
  }, [history])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={handleGoBack} />
        </DialogHeaderLeft>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogBody>
          <VStack spacing={2} mb={6} alignItems='flex-start'>
            <Box>
              <CText fontSize='2xl' fontWeight='bold' mb={0}>
                <Text translation={'walletProvider.shapeShift.import.keystoreHeader'} />
              </CText>
              <CText color='text.subtle' mb={6}>
                <Text translation='walletProvider.shapeShift.import.keystoreImportBody' />
              </CText>
            </Box>
            <VStack spacing={6} width='full'>
              <FormControl isInvalid={Boolean(errors.name)}>
                <Input
                  size='lg'
                  variant='filled'
                  placeholder={translate('walletProvider.create.walletName')}
                  {...register('name', {
                    required: true,
                    maxLength: {
                      value: 64,
                      message: translate('modals.password.error.maxLength', {
                        length: 64,
                      }),
                    },
                  })}
                />
                <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
              </FormControl>
              <FileUpload onFileSelect={handleFileSelect} />
              <FormControl isInvalid={Boolean(errors.keystorePassword)}>
                <Input
                  type='password'
                  placeholder='Keystore Password'
                  size='lg'
                  variant='filled'
                  data-test='wallet-native-keystore-password'
                  {...register('keystorePassword')}
                />
                <FormErrorMessage>{errors.keystorePassword?.message}</FormErrorMessage>
              </FormControl>
            </VStack>
          </VStack>
        </DialogBody>
        <DialogFooter>
          {keystoreFile && (
            <Button
              colorScheme='blue'
              width='full'
              size='lg'
              type='submit'
              isLoading={isSubmitting}
              isDisabled={!isValid}
              data-test='wallet-native-keystore-submit'
            >
              <Text translation='walletProvider.shapeShift.import.importKeystore' />
            </Button>
          )}
        </DialogFooter>
      </form>
    </SlideTransition>
  )
}
