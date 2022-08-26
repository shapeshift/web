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
import { Text } from 'components/Text'
import { updateWallet } from 'context/WalletProvider/MobileWallet/mobileMessageHandlers'

import { MobileSetupProps, NativeWalletValues } from '../types'

export const MobileRename = ({ history, location }: MobileSetupProps) => {
  const translate = useTranslate()

  const onSubmit = async (values: FieldValues) => {
    try {
      console.log('Wallet: ', require('util').inspect(location.state.vault))
      console.log('Label: ', require('util').inspect(values))
      if (
        values.name.length > 0 &&
        location.state.vault?.id &&
        (await updateWallet(location.state.vault.id, { label: values.name }))
      ) {
        history.goBack()
      }
    } catch (e) {
      console.error('WalletProvider:NativeWallet:Rename - Error invalid password', e)
      setError('password', {
        type: 'manual',
        message: translate('modals.shapeShift.password.error.invalid'),
      })
    }
  }

  const {
    setError,
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<NativeWalletValues>({ mode: 'onChange', shouldUnregister: true })

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.rename.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='gray.500' translation={'walletProvider.shapeShift.rename.body'} />
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl mb={6} isInvalid={Boolean(errors.name)}>
            <Input
              {...register('name', {
                maxLength: {
                  value: 64,
                  message: translate('modals.shapeShift.password.error.maxLength', { length: 64 }),
                },
              })}
              size='lg'
              variant='filled'
              id='name'
              placeholder={translate('walletProvider.shapeShift.rename.walletName')}
            />
            <FormErrorMessage>{errors?.name?.message}</FormErrorMessage>
          </FormControl>
          <Button
            colorScheme='blue'
            size='lg'
            width='full'
            type='submit'
            isLoading={isSubmitting}
            isDisabled={Boolean(errors.name)}
          >
            <Text translation={'walletProvider.shapeShift.rename.button'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
