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
import { FileUpload } from 'components/FileUpload/FileUpload'
import { MobileWalletDialogRoutes } from 'components/MobileWalletDialog/types'
import { decryptFromKeystore } from 'components/MobileWalletDialog/utils'
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
      if (!keystoreFile) {
        throw new Error('No keystore uploaded')
      }
      const parsedKeystore = JSON.parse(keystoreFile)

      try {
        const mnemonic = await decryptFromKeystore(parsedKeystore, values.keystorePassword)

        const revocableVault = await addWallet({
          mnemonic,
          label: values.name.trim(),
        })
        history.push(MobileWalletDialogRoutes.ImportSuccess, { vault: revocableVault })
        mixpanel?.track(MixPanelEvent.NativeImportKeystore)
      } catch (e) {
        setError('keystorePassword', {
          type: 'manual',
          message: translate('walletProvider.shapeShift.import.invalidKeystorePassword'),
        })
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
