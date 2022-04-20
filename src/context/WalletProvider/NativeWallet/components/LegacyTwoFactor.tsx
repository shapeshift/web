import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { Text } from 'components/Text'

// @TODO(NeOMakinG): Change this with the mnemonic of the legacy account
const DUMMY_MNEMONIC = 'yolo yolo yolo yolo yolo yolo yolo yolo yolo yolo yolo yolo2'

export const LegacyTwoFactor = () => {
  const [error, setError] = useState<boolean | string>(false)
  const history = useHistory()
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm({ shouldUnregister: true })

  const translate = useTranslate()

  const onSubmit = async (values: FieldValues) => {
    try {
      await new Promise((resolve, reject) => resolve(null))
      // TODO: use response to create wallet vault.
      const vault = await Vault.create(undefined, false)
      vault.meta.set('createdAt', Date.now())
      vault.set('#mnemonic', DUMMY_MNEMONIC)
      history.push('/native/legacy/login/success', { vault })
    } catch (err) {
      setError(translate('walletProvider.shapeShift.legacy.invalidTwoFactor'))
    }

    return
  }

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.legacy.twoFactorAuthentication'} />
      </ModalHeader>
      <ModalBody pt={0}>
        <Text
          color='gray.500'
          mb={4}
          translation={'walletProvider.shapeShift.legacy.twoFactorDescription'}
        />
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl isInvalid={errors.twoFactorCode} mb={4}>
            <Input
              {...register('twoFactorCode', {
                pattern: {
                  value: /^[0-9]{6}$/i,
                  message: translate('walletProvider.shapeShift.legacy.invalidTwoFactor'),
                },
                required: translate('walletProvider.shapeShift.legacy.twoFactorRequired'),
              })}
              type='text'
              placeholder={translate('walletProvider.shapeShift.legacy.twoFactorPlaceholder')}
              variant='filled'
              height={12}
            />
            <FormErrorMessage>{errors.twoFactorCode?.message}</FormErrorMessage>
          </FormControl>

          {error && (
            <Alert status='error' my={4}>
              <AlertIcon />
              {error}
            </Alert>
          )}

          <Button colorScheme='blue' isFullWidth size='lg' type='submit' isLoading={isSubmitting}>
            <Text translation={'common.verify'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
