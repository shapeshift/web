import { Button, FormControl, FormErrorMessage, Input } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { MobileWalletDialogRoutes } from '../types'

import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
} from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { updateWallet } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'

type FormValues = {
  label: string
}

export const RenameWallet = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const translate = useTranslate()
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { label: location.state.vault?.label },
  })

  const onSubmit = useCallback(
    async (values: FormValues) => {
      if (!location.state.vault?.id) return
      try {
        await updateWallet(location.state.vault.id, { label: values.label })
        navigate(-1)
      } catch (e) {
        console.log(e)
      }
    },
    [navigate, location.state.vault?.id],
  )

  const handleBack = useCallback(() => navigate(MobileWalletDialogRoutes.Saved), [navigate])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={handleBack} />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>
          <DialogTitle>{translate('walletProvider.shapeShift.rename.header')}</DialogTitle>
        </DialogHeaderMiddle>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogBody>
          <Text
            mb={6}
            color='text.subtle'
            translation={'walletProvider.shapeShift.rename.mobileBody'}
          />
          <FormControl mb={6} isInvalid={!!errors.label}>
            <Input
              size='lg'
              variant='filled'
              id='name'
              placeholder={translate('walletProvider.shapeShift.rename.walletName')}
              {...register('label', {
                required: true,
                maxLength: {
                  value: 64,
                  message: translate('modals.shapeShift.password.error.maxLength', { length: 64 }),
                },
              })}
            />
            <FormErrorMessage>{errors.label && errors.label.message}</FormErrorMessage>
          </FormControl>
        </DialogBody>
        <DialogFooter pt={4}>
          <Button
            colorScheme='blue'
            size='lg'
            width='full'
            isLoading={isSubmitting}
            type='submit'
            isDisabled={!isValid}
          >
            <Text translation={'walletProvider.shapeShift.rename.button'} />
          </Button>
        </DialogFooter>
      </form>
    </SlideTransition>
  )
}
