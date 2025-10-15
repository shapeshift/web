import {
  Avatar,
  Button,
  FormControl,
  FormErrorMessage,
  Input,
  Stack,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import { DialogHeader, DialogHeaderRight } from '@/components/Modal/components/DialogHeader'
import { Text } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { makeBlockiesUrl } from '@/lib/blockies/makeBlockiesUrl'
import { addressBookSlice } from '@/state/slices/addressBookSlice/addressBookSlice'
import { useAppDispatch } from '@/state/store'

export type AddAddressModalProps = {
  address: string
  chainId: ChainId
  onSuccess?: () => void
}

type FormData = {
  name: string
}

const focusInputStyle = {
  border: 'none',
  boxShadow: 'none',
}

const hoverInputStyle = {
  border: 'none',
}

export const AddAddressModal = ({ address, chainId, onSuccess }: AddAddressModalProps) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()
  const { isOpen, close: onClose } = useModal('addAddress')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: 'onChange',
    defaultValues: {
      name: '',
    },
  })

  const avatarUrl = useMemo(() => makeBlockiesUrl(address), [address])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [onClose, reset])

  const onSubmit = useCallback(
    (data: FormData) => {
      dispatch(
        addressBookSlice.actions.addAddress({
          name: data.name,
          address,
          chainId,
        }),
      )
      onSuccess?.()
      handleClose()
    },
    [dispatch, address, chainId, onSuccess, handleClose],
  )

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <DialogHeader>
        <DialogHeaderRight>
          <DialogCloseButton />
        </DialogHeaderRight>
      </DialogHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogBody>
          <VStack spacing={4} align='center'>
            <Avatar src={avatarUrl} size='lg' />
            <FormControl isInvalid={!!errors.name}>
              <Input
                {...register('name', {
                  required: translate('modals.send.addContact.nameRequired'),
                  minLength: {
                    value: 1,
                    message: translate('modals.send.addContact.nameRequired'),
                  },
                })}
                placeholder={translate('modals.send.addContact.namePlaceholder')}
                autoFocus
                variant='filled'
                size='lg'
                background='transparent'
                textAlign='center'
                fontSize='xl'
                _focus={focusInputStyle}
                _hover={hoverInputStyle}
              />
              <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
            </FormControl>
            <MiddleEllipsis value={address} />
          </VStack>
        </DialogBody>

        <DialogFooter>
          <Stack flex={1} flexDirection='row'>
            <Button onClick={handleClose} width='full' size='lg'>
              <Text translation='common.cancel' />
            </Button>
            <Button type='submit' colorScheme='blue' width='full' size='lg' isDisabled={!isValid}>
              <Text translation='modals.send.addContact.title' />
            </Button>
          </Stack>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
