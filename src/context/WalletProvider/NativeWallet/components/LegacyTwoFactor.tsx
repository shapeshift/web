import {
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import { FieldValues, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router-dom'
import { Text } from 'components/Text'

import { LocationState } from '../types'

export const LegacyTwoFactor = () => {
  const history = useHistory()
  const location = useLocation<LocationState>()
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ shouldUnregister: true })

  const translate = useTranslate()

  const onSubmit = async (values: FieldValues) => {
    history.push('/native/legacy/login/success', { vault: location.state.vault })
    // Reset the field in order to remove the 2fa code from the memory
    reset()
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
          <Button colorScheme='blue' isFullWidth size='lg' type='submit' isLoading={isSubmitting}>
            <Text translation={'common.verify'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
