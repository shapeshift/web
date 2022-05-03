import {
  Button,
  FormControl,
  FormErrorMessage,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  ModalBody,
  ModalHeader,
} from '@chakra-ui/react'
import { Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { useState } from 'react'
import { FieldValues, useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'

import { NativeSetupProps } from '../types'

export const NativeRename = ({ history, location }: NativeSetupProps) => {
  const translate = useTranslate()
  const [showPw, setShowPw] = useState<boolean>(false)

  const handleShowClick = () => setShowPw(!showPw)
  const onSubmit = async (values: FieldValues) => {
    try {
      const vault = await Vault.open(location.state.vault.id, values.password)
      if (values.name.length === 0) {
        const result = window.confirm(translate('walletProvider.shapeShift.rename.confirmDelete'))
        if (result) {
          vault.meta.delete('name')
          await vault.save()
          history.goBack()
        }
      } else {
        vault.meta.set('name', values.name)
        await vault.save()
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
  } = useForm({ mode: 'onChange', shouldUnregister: true })

  return (
    <>
      <ModalHeader>
        <Text translation={'walletProvider.shapeShift.rename.header'} />
      </ModalHeader>
      <ModalBody>
        <Text mb={6} color='gray.500' translation={'walletProvider.shapeShift.rename.body'} />
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormControl mb={6} isInvalid={errors.name}>
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
          <FormControl mb={6} isInvalid={errors.password}>
            <InputGroup size='lg' variant='filled'>
              <Input
                {...register('password', {
                  required: translate('modals.shapeShift.password.error.required'),
                  minLength: {
                    value: 8,
                    message: translate('modals.shapeShift.password.error.length', { length: 8 }),
                  },
                })}
                pr='4.5rem'
                type={showPw ? 'text' : 'password'}
                placeholder={translate('modals.shapeShift.password.placeholder')}
                autoComplete={'password'}
                id='password'
              />
              <InputRightElement>
                <IconButton
                  aria-label={translate(`modals.shapeShift.password.${showPw ? 'hide' : 'show'}`)}
                  h='1.75rem'
                  size='sm'
                  onClick={handleShowClick}
                  icon={!showPw ? <FaEye /> : <FaEyeSlash />}
                />
              </InputRightElement>
            </InputGroup>
            <FormErrorMessage>{errors?.password?.message}</FormErrorMessage>
          </FormControl>
          <Button
            colorScheme='blue'
            size='lg'
            isFullWidth
            type='submit'
            isLoading={isSubmitting}
            isDisabled={errors.name}
          >
            <Text translation={'walletProvider.shapeShift.rename.button'} />
          </Button>
        </form>
      </ModalBody>
    </>
  )
}
