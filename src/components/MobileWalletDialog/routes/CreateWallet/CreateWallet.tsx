import {
  Box,
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  Text as CText,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useLocation, useNavigate } from 'react-router-dom'

import { MobileWalletDialogRoutes } from '../../types'

import { CarouselDots } from '@/components/CarouselDots/CarouselDots'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { SlideTransition } from '@/components/SlideTransition'
import { Text } from '@/components/Text'
import { createWallet } from '@/context/WalletProvider/MobileWallet/mobileMessageHandlers'
import type { RevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'

type FormValues = {
  label: string
}

type CreateWalletProps = {
  isDefaultRoute?: boolean
  onClose: () => void
  handleRedirectToHome: () => void
}

export const CreateWallet = ({
  isDefaultRoute,
  onClose,
  handleRedirectToHome,
}: CreateWalletProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const translate = useTranslate()
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting, isValid },
  } = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: { label: location.state?.vault?.label },
  })
  const [vault, setVault] = useState<RevocableWallet | null>(null)

  const onSubmit = useCallback(
    (values: FormValues) => {
      if (!vault) return

      try {
        vault.label = values.label
        navigate(MobileWalletDialogRoutes.KeepSafe, { state: { vault } })
      } catch (e) {
        console.log(e)
      }
    },
    [navigate, vault],
  )

  const handleBack = useCallback(() => {
    if (isDefaultRoute) {
      onClose()
    } else {
      handleRedirectToHome()
    }
  }, [handleRedirectToHome, isDefaultRoute, onClose])

  useEffect(() => {
    try {
      if (!vault) setVault(location.state?.vault ?? createWallet())
    } catch (e) {
      console.log(e)
    }
  }, [location.state?.vault, setVault, vault])

  return (
    <SlideTransition>
      <DialogHeader>
        <DialogHeaderLeft>
          <DialogBackButton onClick={handleBack} />
        </DialogHeaderLeft>
        <DialogHeaderMiddle>
          <Box minWidth='50px'>
            <CarouselDots length={4} activeIndex={1} />
          </Box>
        </DialogHeaderMiddle>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogBody>
          <VStack spacing={2} mb={6} alignItems='flex-start'>
            <Box>
              <CText fontSize='2xl' fontWeight='bold' mb={0}>
                {translate('walletProvider.create.header')}
              </CText>
              <CText color='text.subtle' mb={6}>
                {translate('walletProvider.create.subHeader')}
              </CText>
            </Box>
            <Box>
              <FormControl isInvalid={!!errors.label}>
                <Input
                  size='lg'
                  variant='filled'
                  placeholder={translate('walletProvider.create.walletName')}
                  {...register('label', {
                    required: true,
                    maxLength: {
                      value: 64,
                      message: translate('modals.password.error.maxLength', {
                        length: 64,
                      }),
                    },
                  })}
                />
                <FormErrorMessage>{errors.label && errors.label.message}</FormErrorMessage>
              </FormControl>
              <Box mt={2}>
                <Text color='text.subtle' translation='walletProvider.create.saveLocally' />
                <Text color='text.subtle' translation='walletProvider.create.visibleToYou' />
              </Box>
            </Box>
          </VStack>
        </DialogBody>
        <DialogFooter>
          <Button
            colorScheme='blue'
            size='lg'
            width='full'
            isLoading={isSubmitting}
            type='submit'
            isDisabled={!isValid}
          >
            {translate('walletProvider.create.button')}
          </Button>
        </DialogFooter>
      </form>
    </SlideTransition>
  )
}
