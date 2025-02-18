import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  Text as CText,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import * as bip39 from 'bip39'
import { useCallback, useMemo } from 'react'
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

type FormValues = { mnemonic: string; name: string }

export const ImportSeedPhrase = () => {
  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ shouldUnregister: true })
  const queryClient = useQueryClient()
  const translate = useTranslate()

  const history = useHistory()

  const handleBack = useCallback(() => {
    history.push(MobileWalletDialogRoutes.Import)
  }, [history])

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        const vault = await addWallet({
          mnemonic: values.mnemonic.toLowerCase().trim(),
          label: values.name.trim(),
        })

        history.push(MobileWalletDialogRoutes.ImportSuccess, { vault })
        queryClient.invalidateQueries({ queryKey: ['listWallets'] })
      } catch (e) {
        console.log(e)
        setError('mnemonic', { type: 'manual', message: 'walletProvider.shapeShift.import.header' })
      }
    },
    [history, queryClient, setError],
  )

  const textareaFormProps = useMemo(() => {
    return register('mnemonic', {
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
    })
  }, [register, translate])

  const inputFormProps = useMemo(() => {
    return register('name', {
      required: translate('modals.shapeShift.password.error.walletNameRequired'),
      maxLength: {
        value: 64,
        message: translate('modals.shapeShift.password.error.maxLength', { length: 64 }),
      },
    })
  }, [register, translate])

  const handleFormSubmit = useMemo(() => handleSubmit(onSubmit), [handleSubmit, onSubmit])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={handleBack} />
        </DialogHeaderLeft>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <form onSubmit={handleFormSubmit}>
        <DialogBody>
          <VStack spacing={2} mb={6} alignItems='flex-start'>
            <Box>
              <CText fontSize='2xl' fontWeight='bold' mb={0}>
                <Text translation='walletProvider.shapeShift.import.header' />
              </CText>
              <CText color='text.subtle' mb={6}>
                <Text translation='walletProvider.shapeShift.import.body' />
              </CText>
            </Box>
            <Box width='full'>
              <FormControl isInvalid={Boolean(errors.mnemonic)} mb={6}>
                <Textarea
                  variant='filled'
                  size='lg'
                  autoComplete='off'
                  autoCorrect='off'
                  textTransform='lowercase'
                  {...textareaFormProps}
                  data-test='wallet-native-seed-input'
                />
                <FormErrorMessage data-test='wallet-native-seed-validation-message'>
                  {errors.mnemonic?.message}
                </FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={Boolean(errors.name)}>
                <Input
                  {...inputFormProps}
                  size='lg'
                  variant='filled'
                  id='name'
                  placeholder={translate('walletProvider.shapeShift.rename.walletName')}
                />
                <FormErrorMessage>{errors?.name?.message}</FormErrorMessage>
              </FormControl>
            </Box>
          </VStack>
        </DialogBody>
        <DialogFooter>
          <Button
            colorScheme='blue'
            width='full'
            size='lg'
            type='submit'
            isLoading={isSubmitting}
            data-test='wallet-native-seed-submit-button'
          >
            <Text translation='walletProvider.shapeShift.import.button' />
          </Button>
        </DialogFooter>
      </form>
    </SlideTransition>
  )
}
